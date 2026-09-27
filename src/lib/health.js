import { row, texecute, tquery } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/ssrf";
import { sendDownEmail, sendUpEmail } from "@/lib/email";
import { id } from "@/lib/ids";

export function alertKind(prevStatus, up) {
  const next = up ? "up" : "down";
  if (prevStatus === next) return null;
  if (next === "down") return "down";
  if (prevStatus === "down") return "up";
  return null;
}

const TIMEOUT_MS = 10_000;

async function pingUrl(url) {
  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const safe = await assertPublicHttpUrl(url);
    const res = await fetch(safe, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Uplitycs-HealthCheck/1.0" },
    });
    const ms = Date.now() - started;
    const up = res.status >= 200 && res.status < 400;
    return {
      url,
      up,
      statusCode: res.status,
      latencyMs: ms,
      error: up ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      url,
      up: false,
      statusCode: 0,
      latencyMs: Date.now() - started,
      error: err.message || "fetch failed",
    };
  } finally {
    clearTimeout(t);
  }
}

export async function checkSiteHealth(siteId) {
  const site = row(await tquery("SELECT * FROM sites WHERE id = ?", [siteId]));
  if (!site || !site.verified) {
    return { skipped: true, reason: "unverified or missing" };
  }
  const urls = await tquery(
    "SELECT url FROM site_health_urls WHERE site_id = ? ORDER BY sort_order",
    [siteId],
  );
  if (!urls.length) return { skipped: true, reason: "no urls" };

  const emails = (
    await tquery("SELECT email FROM site_notification_emails WHERE site_id = ?", [siteId])
  ).map((r) => r.email);

  const results = [];
  for (const { url } of urls) {
    const result = await pingUrl(url);
    results.push(result);
    const prev = row(
      await tquery("SELECT * FROM health_state WHERE site_id = ? AND url = ?", [siteId, url]),
    );
    const kind = alertKind(prev?.status, result.up);
    const now = Date.now();
    await texecute(
      `INSERT INTO health_state (site_id, url, status, last_check_at, last_latency_ms, last_status_code)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (site_id, url) DO UPDATE SET
         status = EXCLUDED.status,
         last_check_at = EXCLUDED.last_check_at,
         last_latency_ms = EXCLUDED.last_latency_ms,
         last_status_code = EXCLUDED.last_status_code`,
      [siteId, url, result.up ? "up" : "down", now, result.latencyMs, result.statusCode],
    );

    if (!result.up) {
      const open = row(
        await tquery(
          `SELECT * FROM downtimes WHERE site_id = ? AND url = ? AND ended_at IS NULL
           ORDER BY started_at DESC LIMIT 1`,
          [siteId, url],
        ),
      );
      if (!open) {
        await texecute(
          `INSERT INTO downtimes (id, site_id, url, started_at, ended_at, last_status_code, last_error)
           VALUES (?, ?, ?, ?, NULL, ?, ?)`,
          [id("down"), siteId, url, now, result.statusCode, result.error],
        );
        if (kind === "down" && emails.length) {
          await sendDownEmail(emails, {
            siteName: site.name,
            url,
            statusCode: result.statusCode,
            error: result.error,
          });
        }
      } else {
        await texecute(
          `UPDATE downtimes SET last_status_code = ?, last_error = ? WHERE id = ?`,
          [result.statusCode, result.error, open.id],
        );
      }
    } else if (prev?.status === "down") {
      const open = row(
        await tquery(
          `SELECT * FROM downtimes WHERE site_id = ? AND url = ? AND ended_at IS NULL
           ORDER BY started_at DESC LIMIT 1`,
          [siteId, url],
        ),
      );
      if (open) {
        await texecute(`UPDATE downtimes SET ended_at = ? WHERE id = ?`, [now, open.id]);
        if (kind === "up" && emails.length) {
          await sendUpEmail(emails, {
            siteName: site.name,
            url,
            downtimeMs: now - open.started_at,
          });
        }
      }
    }
  }

  return { siteId, results };
}

export async function loadHealthTargets() {
  return tquery(
    `SELECT s.id as site_id FROM sites s
     WHERE s.verified = 1
       AND EXISTS (SELECT 1 FROM site_health_urls h WHERE h.site_id = s.id)`,
  );
}

import { jsonCol, row, texecute, tquery } from "@/lib/db";
import { domainMatches, hourBucketUtc, originHost } from "@/lib/utils";

const MAX_BATCH = 50;
const MAX_PATH = 512;

function sanitizeEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const n = String(raw.n || "pageview").slice(0, 64);
  const path = String(raw.path || "/").slice(0, MAX_PATH);
  const ev = {
    n,
    ts: Number(raw.ts) || Date.now(),
    path,
    ref: String(raw.ref || "").slice(0, 512),
    vid: String(raw.vid || "").slice(0, 64),
    sid: String(raw.sid || "").slice(0, 64),
    d: ["m", "t", "d"].includes(raw.d) ? raw.d : "d",
    b: String(raw.b || "other").slice(0, 24),
    os: String(raw.os || "other").slice(0, 24),
    sw: Number(raw.sw) || 0,
    sh: Number(raw.sh) || 0,
  };
  if (raw.utm && typeof raw.utm === "object") {
    ev.utm = {
      source: String(raw.utm.source || "").slice(0, 64),
      medium: String(raw.utm.medium || "").slice(0, 64),
      campaign: String(raw.utm.campaign || "").slice(0, 64),
    };
  }
  if (raw.props && typeof raw.props === "object") {
    ev.props = raw.props;
  }
  return ev;
}

export async function ingestEvents({ body, originHeader, refererHeader, countryCode }) {
  const siteId = body?.siteId;
  const eventsIn = Array.isArray(body?.events) ? body.events : [];
  if (!siteId || !eventsIn.length) {
    return { status: 400, json: { error: "siteId and events required" } };
  }

  const events = eventsIn.slice(0, MAX_BATCH).map(sanitizeEvent).filter(Boolean);
  if (!events.length) {
    return { status: 400, json: { error: "no valid events" } };
  }

  const site = row(await tquery("SELECT * FROM sites WHERE id = ?", [siteId]));
  if (!site) {
    return { status: 404, json: { error: "unknown site" } };
  }

  const envBypass =
    process.env.COLLECT_SKIP_ORIGIN === "1" ||
    process.env.ALLOWED_DOMAINS_BYPASS === "1";
  const host = originHost(originHeader || refererHeader);
  const allowed = jsonCol(site.allowed_domains, []);
  if (!envBypass && !site.bypass_origin) {
    if (!host || !domainMatches(host, allowed)) {
      return { status: 403, json: { error: "origin not allowed" } };
    }
  }

  const accepted = events;
  if (countryCode) {
    for (const ev of accepted) ev.cc = countryCode;
  }

  const hour = hourBucketUtc().getTime();
  const payload = JSON.stringify(accepted);

  await texecute(
    `INSERT INTO hourly_buckets (site_id, hour_bucket, events, event_count, processed)
     VALUES (?, ?, ?::jsonb, ?, 0)
     ON CONFLICT (site_id, hour_bucket)
     DO UPDATE SET
       events = hourly_buckets.events || EXCLUDED.events,
       event_count = hourly_buckets.event_count + EXCLUDED.event_count,
       processed = 0,
       updated_at = NOW()`,
    [siteId, hour, payload, accepted.length],
  );

  const now = Date.now();
  const seen = new Map();
  for (const ev of accepted) {
    if (ev.vid) seen.set(ev.vid, ev.path);
  }
  await Promise.all(
    [...seen.entries()].map(([vid, path]) =>
      texecute(
        `INSERT INTO live_pings (site_id, visitor_id, last_seen, path)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (site_id, visitor_id)
         DO UPDATE SET last_seen = EXCLUDED.last_seen, path = EXCLUDED.path`,
        [siteId, vid, now, path],
      ),
    ),
  );

  if (!site.verified) {
    await texecute("UPDATE sites SET verified = 1 WHERE id = ? AND verified = 0", [siteId]);
  }

  return {
    status: 204,
    json: null,
    meta: {
      siteId,
      workspaceId: site.workspace_id,
      accepted: accepted.length,
    },
  };
}

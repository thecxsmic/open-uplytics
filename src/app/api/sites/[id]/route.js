import { requireUser } from "@/lib/session";
import { jsonError, siteAccess } from "@/lib/permissions";
import { tquery, texecute, logActivity } from "@/lib/db";
import { id } from "@/lib/ids";
import { trackerSnippet } from "@/lib/brand";
import { assertNotDemoSite } from "@/lib/demo";

function normalizeUrls(list) {
  const out = [];
  for (const item of list || []) {
    const u = String(item || "").trim();
    if (!u) continue;
    try {
      const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
      if (!out.includes(parsed.toString())) out.push(parsed.toString());
    } catch {
      continue;
    }
  }
  return out;
}

function normalizeEmails(list) {
  const out = [];
  for (const item of list || []) {
    const e = String(item || "").trim().toLowerCase();
    if (e.includes("@") && !out.includes(e)) out.push(e);
  }
  return out;
}

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    const { site, membership } = await siteAccess(user.id, siteId);
    const healthUrls = await tquery(
      "SELECT url FROM site_health_urls WHERE site_id = ? ORDER BY sort_order",
      [siteId],
    );
    const emails = await tquery(
      "SELECT email FROM site_notification_emails WHERE site_id = ?",
      [siteId],
    );
    return Response.json({
      site,
      role: membership.role,
      healthUrls: healthUrls.map((r) => r.url),
      notificationEmails: emails.map((r) => r.email),
      snippet: trackerSnippet(site.id),
      metaTag: `<meta name="uplitycs-site-verification" content="${site.verification_token}" />`,
      dnsTxt: `uplitycs-verification=${site.verification_token}`,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    const { site } = await siteAccess(user.id, siteId);
    await assertNotDemoSite(siteId);
    const body = await request.json().catch(() => ({}));

    const name = body.name ? String(body.name).trim().slice(0, 80) : site.name;
    const domain = body.domain
      ? String(body.domain).trim().replace(/^https?:\/\//, "").split("/")[0].toLowerCase()
      : site.domain;
    const allowed = Array.isArray(body.allowedDomains)
      ? body.allowedDomains.map((d) =>
          String(d).toLowerCase().replace(/^https?:\/\//, "").split("/")[0],
        )
      : JSON.parse(site.allowed_domains || "[]");
    const bypass =
      typeof body.bypassOrigin === "boolean" ? (body.bypassOrigin ? 1 : 0) : site.bypass_origin;

    await texecute(
      `UPDATE sites SET name = ?, domain = ?, allowed_domains = ?, bypass_origin = ? WHERE id = ?`,
      [name, domain, JSON.stringify(allowed.length ? allowed : [domain]), bypass, siteId],
    );

    if (Array.isArray(body.healthUrls)) {
      await texecute("DELETE FROM site_health_urls WHERE site_id = ?", [siteId]);
      const urls = normalizeUrls(body.healthUrls);
      for (let i = 0; i < urls.length; i++) {
        await texecute(
          `INSERT INTO site_health_urls (id, site_id, url, sort_order) VALUES (?, ?, ?, ?)`,
          [id("hu"), siteId, urls[i], i],
        );
      }
    }
    if (Array.isArray(body.notificationEmails)) {
      await texecute("DELETE FROM site_notification_emails WHERE site_id = ?", [siteId]);
      for (const email of normalizeEmails(body.notificationEmails)) {
        await texecute(
          `INSERT INTO site_notification_emails (id, site_id, email) VALUES (?, ?, ?)`,
          [id("em"), siteId, email],
        );
      }
    }

    await logActivity(site.workspace_id, user.id, "site.updated", { siteId });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    const { site } = await siteAccess(user.id, siteId);
    await assertNotDemoSite(siteId);
    await texecute("DELETE FROM site_health_urls WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM site_notification_emails WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM hourly_stats WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM hourly_buckets WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM live_pings WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM downtimes WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM health_state WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM alert_email_days WHERE site_id = ?", [siteId]);
    await texecute("DELETE FROM sites WHERE id = ?", [siteId]);
    await logActivity(site.workspace_id, user.id, "site.removed", { siteId });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

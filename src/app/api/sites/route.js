import { requireUser } from "@/lib/session";
import { jsonError, requireMember } from "@/lib/permissions";
import { texecute, logActivity } from "@/lib/db";
import { id, siteId as makeSiteId, token } from "@/lib/ids";
import { slugify } from "@/lib/utils";
import { assertNotDemoWorkspace } from "@/lib/demo";
import { trackerSnippet } from "@/lib/brand";

function normalizeUrls(list) {
  const out = [];
  for (const item of list || []) {
    const u = String(item || "").trim();
    if (!u) continue;
    try {
      const parsed = new URL(u.startsWith("http") ? u : `https://${u}`);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
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

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const workspaceId = body.workspaceId;
    await requireMember(user.id, workspaceId);
    await assertNotDemoWorkspace(workspaceId);
    const name = String(body.name || "").trim().slice(0, 80);
    const domain = String(body.domain || "")
      .trim()
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .toLowerCase();
    if (!name || !domain) {
      return Response.json({ error: "name and domain required" }, { status: 400 });
    }

    const extraDomains = Array.isArray(body.allowedDomains) ? body.allowedDomains : [];
    const allowed = Array.from(
      new Set(
        [domain, ...extraDomains.map((d) => String(d).toLowerCase().replace(/^https?:\/\//, "").split("/")[0])].filter(Boolean),
      ),
    );

    const sid = makeSiteId();
    const statusSlug = `${slugify(name)}-${sid.slice(0, 6)}`;
    const now = Date.now();
    const verificationToken = token();
    const bypass = Boolean(body.bypassOrigin) || process.env.NODE_ENV !== "production";

    await texecute(
      `INSERT INTO sites (
         id, workspace_id, name, domain, allowed_domains, bypass_origin, verified,
         verification_token, timezone, public_status, status_slug, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)`,
      [
        sid,
        workspaceId,
        name,
        domain,
        JSON.stringify(allowed),
        bypass ? 1 : 0,
        verificationToken,
        body.timezone || "UTC",
        statusSlug,
        now,
      ],
    );

    const healthUrls = normalizeUrls(body.healthUrls);
    for (let i = 0; i < healthUrls.length; i++) {
      await texecute(
        `INSERT INTO site_health_urls (id, site_id, url, sort_order) VALUES (?, ?, ?, ?)`,
        [id("hu"), sid, healthUrls[i], i],
      );
    }
    for (const email of normalizeEmails(body.notificationEmails)) {
      await texecute(
        `INSERT INTO site_notification_emails (id, site_id, email) VALUES (?, ?, ?)`,
        [id("em"), sid, email],
      );
    }

    await logActivity(workspaceId, user.id, "site.added", { siteId: sid, domain });
    return Response.json({
      ok: true,
      site: {
        id: sid,
        name,
        domain,
        statusSlug,
        verificationToken,
        snippet: trackerSnippet(sid),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

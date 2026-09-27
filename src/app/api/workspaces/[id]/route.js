import { requireUser } from "@/lib/session";
import { jsonError, requireMember } from "@/lib/permissions";
import { tquery, texecute, logActivity } from "@/lib/db";
import { assertNotDemoWorkspace } from "@/lib/demo";

async function deleteSiteRows(siteId) {
  await texecute("DELETE FROM site_health_urls WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM site_notification_emails WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM hourly_stats WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM hourly_buckets WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM live_pings WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM downtimes WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM health_state WHERE site_id = ?", [siteId]);
  await texecute("DELETE FROM alert_email_days WHERE site_id = ?", [siteId]);
}

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const membership = await requireMember(user.id, id);
    const sites = await tquery(
      "SELECT id, name, domain, verified, status_slug, created_at FROM sites WHERE workspace_id = ? ORDER BY created_at DESC",
      [id],
    );
    return Response.json({ workspace: membership, sites });
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireMember(user.id, id);
    await assertNotDemoWorkspace(id);
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    await texecute("UPDATE workspaces SET name = ? WHERE id = ?", [name, id]);
    if (Object.prototype.hasOwnProperty.call(body, "brandName")) {
      const brandName = String(body.brandName || "").trim().slice(0, 80);
      await texecute("UPDATE workspaces SET brand_name = ? WHERE id = ?", [
        brandName || null,
        id,
      ]);
    }
    if (Object.prototype.hasOwnProperty.call(body, "brandHide")) {
      await texecute("UPDATE workspaces SET brand_hide = ? WHERE id = ?", [
        body.brandHide ? 1 : 0,
        id,
      ]);
    }
    await logActivity(id, user.id, "workspace.renamed", { name });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(_req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireMember(user.id, id);
    await assertNotDemoWorkspace(id);
    const sites = await tquery("SELECT id FROM sites WHERE workspace_id = ?", [id]);
    for (const s of sites) await deleteSiteRows(s.id);
    await texecute("DELETE FROM sites WHERE workspace_id = ?", [id]);
    await texecute("DELETE FROM activity_log WHERE workspace_id = ?", [id]);
    await texecute("DELETE FROM workspaces WHERE id = ?", [id]);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

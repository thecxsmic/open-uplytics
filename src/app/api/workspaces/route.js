import { requireUser } from "@/lib/session";
import { jsonError } from "@/lib/permissions";
import { tquery, texecute, logActivity } from "@/lib/db";
import { id } from "@/lib/ids";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await tquery(
      `SELECT w.*, 'owner' AS role,
              (SELECT COUNT(*)::int FROM sites s WHERE s.workspace_id = w.id) AS site_count
       FROM workspaces w
       WHERE w.owner_id = ?
       ORDER BY w.created_at DESC`,
      [user.id],
    );
    return Response.json({ workspaces: rows });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const wsId = id("ws");
    let slug = slugify(name);
    const clash = await tquery("SELECT id FROM workspaces WHERE slug = ?", [slug]);
    if (clash.length) slug = `${slug}-${wsId.slice(-6)}`;
    const now = Date.now();
    await texecute(
      `INSERT INTO workspaces (id, name, slug, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [wsId, name, slug, user.id, now],
    );
    await logActivity(wsId, user.id, "workspace.created", { name });
    return Response.json({ ok: true, id: wsId, slug });
  } catch (err) {
    return jsonError(err);
  }
}

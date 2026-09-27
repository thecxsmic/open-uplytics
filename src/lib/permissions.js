import { row, tquery } from "@/lib/db";

export async function getMembership(userId, workspaceId) {
  return row(
    await tquery(
      `SELECT 'owner' AS role, w.id AS workspace_id, w.owner_id, w.name, w.slug, w.brand_name, w.brand_hide, w.is_demo
       FROM workspaces w
       WHERE w.owner_id = ? AND w.id = ?`,
      [userId, workspaceId],
    ),
  );
}

export async function requireMember(userId, workspaceId) {
  if (!userId) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  const membership = await getMembership(userId, workspaceId);
  if (!membership) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return membership;
}

export async function siteAccess(userId, siteId) {
  const site = row(
    await tquery(
      `SELECT s.*, w.owner_id, w.brand_name, w.brand_hide
       FROM sites s JOIN workspaces w ON w.id = s.workspace_id WHERE s.id = ?`,
      [siteId],
    ),
  );
  if (!site) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  const membership = await requireMember(userId, site.workspace_id);
  return { site, membership };
}

export function jsonError(error) {
  const status = error.status || 500;
  return Response.json({ error: error.message || "Error" }, { status });
}

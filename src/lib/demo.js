import { tquery, row } from "@/lib/db";
import {
  DEMO_OWNER_ID,
  DEMO_SITE_IDS,
  DEMO_SITE_MARKETING,
  DEMO_SITE_STORE,
  DEMO_SLUG,
  DEMO_WORKSPACE_ID,
} from "@/lib/demo-ids";

export {
  DEMO_OWNER_ID,
  DEMO_SITE_IDS,
  DEMO_SITE_MARKETING,
  DEMO_SITE_STORE,
  DEMO_SLUG,
  DEMO_WORKSPACE_ID,
};

function readOnlyError() {
  const err = new Error(
    "Demo workspace is read-only. Create a free account to make changes.",
  );
  err.status = 403;
  return err;
}

export async function getDemoWorkspace() {
  try {
    return row(
      await tquery(
        "SELECT * FROM workspaces WHERE id = ? OR slug = ? LIMIT 1",
        [DEMO_WORKSPACE_ID, DEMO_SLUG],
      ),
    );
  } catch {
    return null;
  }
}

export async function workspaceIsDemo(workspaceId) {
  if (!workspaceId) return false;
  if (workspaceId === DEMO_WORKSPACE_ID) return true;
  const rec = row(
    await tquery("SELECT * FROM workspaces WHERE id = ?", [workspaceId]),
  );
  if (!rec) return false;
  if (rec.slug === DEMO_SLUG) return true;
  return Number(rec.is_demo) === 1;
}

export async function siteIsDemo(siteId) {
  if (!siteId) return false;
  if (DEMO_SITE_IDS.includes(siteId)) return true;
  const rec = row(
    await tquery("SELECT workspace_id FROM sites WHERE id = ?", [siteId]),
  );
  if (!rec) return false;
  return workspaceIsDemo(rec.workspace_id);
}

export async function assertNotDemoWorkspace(workspaceId) {
  if (await workspaceIsDemo(workspaceId)) throw readOnlyError();
}

export async function assertNotDemoSite(siteId) {
  if (await siteIsDemo(siteId)) throw readOnlyError();
}

export async function getDemoPayload() {
  const workspace = await getDemoWorkspace();
  if (!workspace) return null;
  const sites = await tquery(
    `SELECT id, name, domain, verified, status_slug, created_at
     FROM sites WHERE workspace_id = ? ORDER BY created_at ASC`,
    [workspace.id],
  );
  return { workspace, sites };
}

export async function ensureDemoSite(siteId) {
  const workspace = await getDemoWorkspace();
  if (!workspace) {
    const err = new Error("Demo workspace is not seeded");
    err.status = 404;
    throw err;
  }
  const site = row(
    await tquery(
      "SELECT * FROM sites WHERE id = ? AND workspace_id = ?",
      [siteId, workspace.id],
    ),
  );
  if (!site) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  return { workspace, site };
}

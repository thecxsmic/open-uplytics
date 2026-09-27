import { checkSiteHealth } from "@/lib/health";
import { cronAuthorized } from "@/lib/cron-auth";
import { requireUser } from "@/lib/session";
import { siteAccess, jsonError } from "@/lib/permissions";
import { assertNotDemoSite } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const siteId = body.siteId;
    if (!siteId) {
      return Response.json({ error: "siteId required" }, { status: 400 });
    }
    if (!cronAuthorized(request)) {
      const user = await requireUser();
      await siteAccess(user.id, siteId, "site.write");
      await assertNotDemoSite(siteId);
    }
    const result = await checkSiteHealth(siteId);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}

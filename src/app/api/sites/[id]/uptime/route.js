import { requireUser } from "@/lib/session";
import { jsonError, siteAccess } from "@/lib/permissions";
import { loadSiteUptime } from "@/lib/uptime-data";

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    await siteAccess(user.id, siteId, "site.read");
    const data = await loadSiteUptime(siteId);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}

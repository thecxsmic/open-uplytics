import { ensureDemoSite } from "@/lib/demo";
import { loadSiteUptime } from "@/lib/uptime-data";
import { jsonError } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const { id: siteId } = await params;
    await ensureDemoSite(siteId);
    const data = await loadSiteUptime(siteId);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}

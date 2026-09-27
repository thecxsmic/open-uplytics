import { ensureDemoSite } from "@/lib/demo";
import { loadSiteAnalytics } from "@/lib/analytics";
import { jsonError } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { id: siteId } = await params;
    await ensureDemoSite(siteId);
    const range = new URL(request.url).searchParams.get("range") || "7d";
    const data = await loadSiteAnalytics(siteId, range);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}

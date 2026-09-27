import { requireUser } from "@/lib/session";
import { jsonError, siteAccess } from "@/lib/permissions";
import { loadSiteAnalytics } from "@/lib/analytics";

export async function GET(request, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    await siteAccess(user.id, siteId, "site.read");
    const range = new URL(request.url).searchParams.get("range") || "7d";
    const data = await loadSiteAnalytics(siteId, range);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}

import { ensureDemoSite } from "@/lib/demo";
import { jsonError } from "@/lib/permissions";
import { tquery } from "@/lib/db";
import { trackerSnippet } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  try {
    const { id: siteId } = await params;
    const { site } = await ensureDemoSite(siteId);
    const healthUrls = await tquery(
      "SELECT url FROM site_health_urls WHERE site_id = ? ORDER BY sort_order",
      [siteId],
    );
    return Response.json({
      site: {
        id: site.id,
        name: site.name,
        domain: site.domain,
        verified: site.verified,
        status_slug: site.status_slug,
        public_status: site.public_status,
      },
      role: "viewer",
      healthUrls: healthUrls.map((r) => r.url),
      snippet: trackerSnippet(site.id),
    });
  } catch (err) {
    return jsonError(err);
  }
}

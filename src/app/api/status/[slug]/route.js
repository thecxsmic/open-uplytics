import { row, tquery } from "@/lib/db";
import { threeMonthsAgoMs } from "@/lib/utils";

export async function GET(_req, { params }) {
  const { slug } = await params;
  const site = row(
    await tquery(
      `SELECT s.id, s.name, s.domain, s.public_status, s.verified,
              w.brand_name, w.brand_hide
       FROM sites s JOIN workspaces w ON w.id = s.workspace_id
       WHERE s.status_slug = ?`,
      [slug],
    ),
  );
  if (!site || !site.public_status) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const from = threeMonthsAgoMs();
  const urls = await tquery(
    "SELECT url FROM site_health_urls WHERE site_id = ? ORDER BY sort_order",
    [site.id],
  );
  const state = await tquery("SELECT * FROM health_state WHERE site_id = ?", [site.id]);
  const downtimes = await tquery(
    `SELECT url, started_at, ended_at, last_status_code FROM downtimes
     WHERE site_id = ? AND started_at >= ? ORDER BY started_at DESC`,
    [site.id, from],
  );
  return Response.json({
    site: { name: site.name, domain: site.domain, verified: site.verified },
    urls: urls.map((u) => u.url),
    state,
    downtimes,
    from,
    brand: {
      name: site.brand_name || site.name,
      hidePoweredBy: Number(site.brand_hide) === 1,
    },
  });
}

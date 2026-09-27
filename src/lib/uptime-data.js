import { tquery } from "@/lib/db";
import { threeMonthsAgoMs } from "@/lib/utils";

export async function loadSiteUptime(siteId) {
  const from = threeMonthsAgoMs();
  const urls = await tquery(
    "SELECT url FROM site_health_urls WHERE site_id = ? ORDER BY sort_order",
    [siteId],
  );
  const state = await tquery("SELECT * FROM health_state WHERE site_id = ?", [siteId]);
  const downtimes = await tquery(
    `SELECT * FROM downtimes WHERE site_id = ? AND started_at >= ? ORDER BY started_at DESC`,
    [siteId, from],
  );
  return { urls: urls.map((u) => u.url), state, downtimes, from };
}

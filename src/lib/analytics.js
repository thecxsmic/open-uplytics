import { row, tquery } from "@/lib/db";
import { topN, aggregateEvents, mergeAggregates } from "@/lib/aggregate";
import { chartSeries } from "@/lib/chart-series";
import { hourBucketUtc } from "@/lib/utils";

function asEvents(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function loadSiteAnalytics(siteId, range = "7d") {
  const days = range === "30d" ? 30 : range === "24h" ? 1 : 7;
  const from = Date.now() - days * 24 * 3600 * 1000;

  const rows = await tquery(
    `SELECT * FROM hourly_stats WHERE site_id = ? AND hour_bucket >= ? ORDER BY hour_bucket ASC`,
    [siteId, from],
  );

  let agg = {
    pageviews: 0,
    visitors: 0,
    pages: {},
    referrers: {},
    devices: {},
    browsers: {},
    os: {},
    utmSources: {},
    customEvents: {},
    countries: {},
  };
  const series = [];
  for (const r of rows) {
    const incoming = {
      pageviews: r.pageviews,
      visitors: r.visitors,
      pages: r.pages ? JSON.parse(r.pages) : {},
      referrers: r.referrers ? JSON.parse(r.referrers) : {},
      devices: r.devices ? JSON.parse(r.devices) : {},
      browsers: r.browsers ? JSON.parse(r.browsers) : {},
      os: r.os ? JSON.parse(r.os) : {},
      utmSources: r.utm_sources ? JSON.parse(r.utm_sources) : {},
      customEvents: r.custom_events ? JSON.parse(r.custom_events) : {},
      countries: r.countries ? JSON.parse(r.countries) : {},
    };
    agg = mergeAggregates(agg, incoming);
    series.push({ t: Number(r.hour_bucket), pageviews: r.pageviews, visitors: r.visitors });
  }

  const currentHour = hourBucketUtc().getTime();
  const liveBucket = row(
    await tquery(
      "SELECT events FROM hourly_buckets WHERE site_id = ? AND hour_bucket = ?",
      [siteId, currentHour],
    ),
  );
  const liveEvents = asEvents(liveBucket?.events);
  if (liveEvents.length) {
    const liveAgg = aggregateEvents(liveEvents);
    agg = mergeAggregates(agg, liveAgg);
    series.push({
      t: currentHour,
      pageviews: liveAgg.pageviews,
      visitors: liveAgg.visitors,
    });
  }

  const liveRow = row(
    await tquery(
      "SELECT COUNT(*)::int AS n FROM live_pings WHERE site_id = ? AND last_seen >= ?",
      [siteId, Date.now() - 30 * 1000],
    ),
  );

  return {
    pageviews: agg.pageviews,
    visitors: agg.visitors,
    live: Number(liveRow?.n || 0),
    series: chartSeries(range, series),
    pages: topN(agg.pages, 12),
    referrers: topN(agg.referrers, 12),
    devices: topN(agg.devices, 6),
    browsers: topN(agg.browsers, 8),
    os: topN(agg.os, 8),
    utmSources: topN(agg.utmSources, 8),
    customEvents: topN(agg.customEvents, 8),
    countries: topN(agg.countries, 80),
  };
}

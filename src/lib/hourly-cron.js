import { texecute, tquery, row } from "@/lib/db";
import { aggregateEvents } from "@/lib/aggregate";
import { hourBucketUtc, threeMonthsAgoMs } from "@/lib/utils";

function mergeCountMap(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = (out[k] || 0) + Number(v || 0);
  return out;
}

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

export async function runHourlyTransfer() {
  const cutoff = hourBucketUtc().getTime();
  const buckets = await tquery(
    `SELECT * FROM hourly_buckets
     WHERE processed = 0 AND hour_bucket < ?
     ORDER BY hour_bucket ASC
     LIMIT 500`,
    [cutoff],
  );

  let transferred = 0;

  for (const bucket of buckets) {
    const events = asEvents(bucket.events);
    const agg = aggregateEvents(events);
    const hourMs = Number(bucket.hour_bucket);

    const existing = row(
      await tquery(
        "SELECT * FROM hourly_stats WHERE site_id = ? AND hour_bucket = ?",
        [bucket.site_id, hourMs],
      ),
    );

    const pages = mergeCountMap(existing?.pages ? JSON.parse(existing.pages) : {}, agg.pages);
    const referrers = mergeCountMap(
      existing?.referrers ? JSON.parse(existing.referrers) : {},
      agg.referrers,
    );
    const devices = mergeCountMap(
      existing?.devices ? JSON.parse(existing.devices) : {},
      agg.devices,
    );
    const browsers = mergeCountMap(
      existing?.browsers ? JSON.parse(existing.browsers) : {},
      agg.browsers,
    );
    const os = mergeCountMap(existing?.os ? JSON.parse(existing.os) : {}, agg.os);
    const utm = mergeCountMap(
      existing?.utm_sources ? JSON.parse(existing.utm_sources) : {},
      agg.utmSources,
    );
    const custom = mergeCountMap(
      existing?.custom_events ? JSON.parse(existing.custom_events) : {},
      agg.customEvents,
    );
    const countries = mergeCountMap(
      existing?.countries ? JSON.parse(existing.countries) : {},
      agg.countries,
    );

    await texecute(
      `INSERT INTO hourly_stats (
         site_id, hour_bucket, pageviews, visitors, pages, referrers, devices, browsers, os, utm_sources, custom_events, countries
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (site_id, hour_bucket) DO UPDATE SET
         pageviews = hourly_stats.pageviews + EXCLUDED.pageviews,
         visitors = hourly_stats.visitors + EXCLUDED.visitors,
         pages = EXCLUDED.pages,
         referrers = EXCLUDED.referrers,
         devices = EXCLUDED.devices,
         browsers = EXCLUDED.browsers,
         os = EXCLUDED.os,
         utm_sources = EXCLUDED.utm_sources,
         custom_events = EXCLUDED.custom_events,
         countries = EXCLUDED.countries`,
      [
        bucket.site_id,
        hourMs,
        agg.pageviews,
        agg.visitors,
        JSON.stringify(pages),
        JSON.stringify(referrers),
        JSON.stringify(devices),
        JSON.stringify(browsers),
        JSON.stringify(os),
        JSON.stringify(utm),
        JSON.stringify(custom),
        JSON.stringify(countries),
      ],
    );

    await texecute(
      `UPDATE hourly_buckets
       SET processed = 1, events = '[]'::jsonb, updated_at = NOW()
       WHERE site_id = ? AND hour_bucket = ?`,
      [bucket.site_id, hourMs],
    );
    transferred += 1;
  }

  await texecute(`DELETE FROM live_pings WHERE last_seen < ?`, [Date.now() - 10 * 60 * 1000]);

  const cutoffMs = threeMonthsAgoMs();
  await texecute(`DELETE FROM downtimes WHERE started_at < ? AND ended_at IS NOT NULL`, [cutoffMs]);
  await texecute(`DELETE FROM hourly_stats WHERE hour_bucket < ?`, [
    Date.now() - 400 * 24 * 60 * 60 * 1000,
  ]);
  await texecute(
    `DELETE FROM hourly_buckets WHERE processed = 1 AND hour_bucket < ?`,
    [Date.now() - 2 * 24 * 3600 * 1000],
  );

  return { transferred, buckets: buckets.length };
}

#!/usr/bin/env node
/**
 * Idempotent demo workspace + 30 days of sample analytics/uptime.
 * Usage: npm run db:demo
 */
import { loadProjectEnv } from "./load-env.mjs";
import { createDb, exec as run, toPg } from "./pg.mjs";

loadProjectEnv();

const DEMO_WORKSPACE_ID = "ws_demo_uplytics";
const DEMO_SLUG = "demo";
const DEMO_OWNER_ID = "usr_demo_uplytics";
const DEMO_SITE_MARKETING = process.env.DEMO_SITE_ID || "uplyticsweb1";
const DEMO_SITE_STORE = "acmeshopdemo";
const DOMAIN = "uplytics.space";

const pool = createDb();

async function exec(sql, args = []) {
  return run(pool, sql, args);
}

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rand, items) {
  const total = items.reduce((s, it) => s + it.w, 0);
  let n = rand() * total;
  for (const it of items) {
    n -= it.w;
    if (n <= 0) return it.v;
  }
  return items[items.length - 1].v;
}

function bump(map, key, n = 1) {
  map[key] = (map[key] || 0) + n;
}

function hourTraffic(date, rand, base) {
  const hour = date.getUTCHours();
  const day = date.getUTCDay();
  const weekday = day === 0 || day === 6 ? 0.42 : 1;
  const tod =
    hour < 6 ? 0.18 : hour < 9 ? 0.55 : hour < 17 ? 1 : hour < 22 ? 0.78 : 0.32;
  const noise = 0.72 + rand() * 0.55;
  return Math.max(0, Math.round(base * weekday * tod * noise));
}

function hourStats(date, rand, base, pages, refs) {
  const pageviews = hourTraffic(date, rand, base);
  const visitors = Math.max(1, Math.round(pageviews * (0.42 + rand() * 0.22)));
  const pageMap = {};
  const refMap = {};
  const devices = {};
  const browsers = {};
  const os = {};
  const utm = {};
  const custom = {};
  const countries = {};
  for (let i = 0; i < pageviews; i++) {
    bump(pageMap, pickWeighted(rand, pages));
    bump(refMap, pickWeighted(rand, refs));
    bump(devices, pickWeighted(rand, [
      { v: "d", w: 58 },
      { v: "m", w: 36 },
      { v: "t", w: 6 },
    ]));
    bump(browsers, pickWeighted(rand, [
      { v: "chrome", w: 62 },
      { v: "safari", w: 22 },
      { v: "firefox", w: 9 },
      { v: "edge", w: 7 },
    ]));
    bump(os, pickWeighted(rand, [
      { v: "macos", w: 28 },
      { v: "windows", w: 34 },
      { v: "ios", w: 20 },
      { v: "android", w: 14 },
      { v: "linux", w: 4 },
    ]));
    if (rand() < 0.12) bump(utm, pickWeighted(rand, [
      { v: "google", w: 50 },
      { v: "newsletter", w: 30 },
      { v: "launch", w: 20 },
    ]));
    if (rand() < 0.04) {
      bump(custom, pickWeighted(rand, [
        { v: "signup", w: 40 },
        { v: "checkout", w: 25 },
        { v: "docs_search", w: 35 },
      ]));
    }
    bump(countries, pickWeighted(rand, [
      { v: "US", w: 28 },
      { v: "IN", w: 9 },
      { v: "GB", w: 8 },
      { v: "DE", w: 7 },
      { v: "BR", w: 5 },
      { v: "CA", w: 5 },
      { v: "FR", w: 4 },
      { v: "AU", w: 4 },
      { v: "JP", w: 3 },
      { v: "NL", w: 3 },
      { v: "MX", w: 3 },
      { v: "ES", w: 3 },
      { v: "ID", w: 2 },
      { v: "KR", w: 2 },
      { v: "SE", w: 2 },
      { v: "PL", w: 2 },
      { v: "IT", w: 2 },
      { v: "NG", w: 2 },
      { v: "SG", w: 2 },
      { v: "ZA", w: 2 },
      { v: "AE", w: 1 },
      { v: "IE", w: 1 },
    ]));
  }
  return {
    pageviews,
    visitors,
    pages: pageMap,
    referrers: refMap,
    devices,
    browsers,
    os,
    utmSources: utm,
    customEvents: custom,
    countries,
  };
}

try {
  await exec(
    "ALTER TABLE workspaces ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0",
  );
  console.log("added workspaces.is_demo");
} catch {
  /* already present */
}

try {
  await exec("ALTER TABLE hourly_stats ADD COLUMN countries TEXT");
  console.log("added hourly_stats.countries");
} catch {
  /* already present */
}

const now = Date.now();

await exec(
  `INSERT INTO workspaces (id, name, slug, owner_id, created_at, is_demo)
   VALUES (?, ?, ?, ?, ?, 1)
   ON CONFLICT (id) DO UPDATE SET
     name = EXCLUDED.name,
     slug = EXCLUDED.slug,
     is_demo = 1`,
  [
    DEMO_WORKSPACE_ID,
    "Uplytics",
    DEMO_SLUG,
    DEMO_OWNER_ID,
    now - 40 * 24 * 3600 * 1000,
  ],
);

const sites = [
  {
    id: DEMO_SITE_MARKETING,
    name: "Uplytics",
    domain: DOMAIN,
    allowed: [DOMAIN, `www.${DOMAIN}`, "localhost"],
    slug: "uplytics",
    health: [`https://${DOMAIN}`, `https://${DOMAIN}/sign-in`],
    pages: [
      { v: "/", w: 40 },
      { v: "/demo", w: 18 },
      { v: "/docs", w: 16 },
      { v: "/sign-in", w: 10 },
      { v: "/sign-up", w: 9 },
      { v: "/blog/launch", w: 7 },
    ],
    refs: [
      { v: "direct", w: 38 },
      { v: "google.com", w: 28 },
      { v: "t.co", w: 12 },
      { v: "github.com", w: 10 },
      { v: "news.ycombinator.com", w: 8 },
      { v: "linkedin.com", w: 4 },
    ],
    base: 34,
  },
  {
    id: DEMO_SITE_STORE,
    name: "Acme Store",
    domain: "shop.acme.dev",
    allowed: ["shop.acme.dev"],
    slug: "acme-store",
    health: ["https://example.com"],
    pages: [
      { v: "/", w: 30 },
      { v: "/products", w: 22 },
      { v: "/products/aurora-jacket", w: 14 },
      { v: "/cart", w: 12 },
      { v: "/checkout", w: 10 },
      { v: "/blog/spring", w: 12 },
    ],
    refs: [
      { v: "direct", w: 32 },
      { v: "google.com", w: 30 },
      { v: "instagram.com", w: 14 },
      { v: "facebook.com", w: 10 },
      { v: "pinterest.com", w: 8 },
      { v: "newsletter", w: 6 },
    ],
    base: 52,
  },
];

for (const s of sites) {
  await exec(
    `INSERT INTO sites (
       id, workspace_id, name, domain, allowed_domains, bypass_origin, verified,
       verification_token, timezone, public_status, status_slug, created_at
     ) VALUES (?, ?, ?, ?, ?, 0, 1, ?, 'UTC', 1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name,
       domain = excluded.domain,
       allowed_domains = excluded.allowed_domains,
       verified = 1,
       public_status = 1,
       status_slug = excluded.status_slug`,
    [
      s.id,
      DEMO_WORKSPACE_ID,
      s.name,
      s.domain,
      JSON.stringify(s.allowed),
      `demo-${s.id}`,
      s.slug,
      now - 35 * 24 * 3600 * 1000,
    ],
  );
  await exec("DELETE FROM site_health_urls WHERE site_id = ?", [s.id]);
  for (let i = 0; i < s.health.length; i++) {
    await exec(
      `INSERT INTO site_health_urls (id, site_id, url, sort_order) VALUES (?, ?, ?, ?)`,
      [`hu_${s.id}_${i}`, s.id, s.health[i], i],
    );
  }
  await exec("DELETE FROM site_notification_emails WHERE site_id = ?", [s.id]);
  await exec("DELETE FROM hourly_stats WHERE site_id = ?", [s.id]);
  await exec("DELETE FROM downtimes WHERE site_id = ?", [s.id]);
  await exec("DELETE FROM health_state WHERE site_id = ?", [s.id]);
  await exec("DELETE FROM alert_email_days WHERE site_id = ?", [s.id]);
}

await exec("DELETE FROM activity_log WHERE workspace_id = ?", [DEMO_WORKSPACE_ID]);
await exec(
  `INSERT INTO activity_log (id, workspace_id, user_id, action, meta, created_at)
   VALUES (?, ?, ?, 'workspace.created', ?, ?)`,
  [
    "act_demo_ws",
    DEMO_WORKSPACE_ID,
    DEMO_OWNER_ID,
    JSON.stringify({ name: "Uplytics" }),
    now - 40 * 24 * 3600 * 1000,
  ],
);

const currentHourStart = new Date();
currentHourStart.setUTCMinutes(0, 0, 0);
const from = currentHourStart.getTime() - 30 * 24 * 3600 * 1000;
let monthPageviews = 0;

for (const s of sites) {
  const rand = mulberry32(
    s.id.split("").reduce((n, c) => n + c.charCodeAt(0), 7),
  );
  const statements = [];
  for (let t = from; t < currentHourStart.getTime(); t += 3600 * 1000) {
    const agg = hourStats(new Date(t), rand, s.base, s.pages, s.refs);
    monthPageviews += agg.pageviews;
    statements.push({
      sql: `INSERT INTO hourly_stats (
              site_id, hour_bucket, pageviews, visitors, pages, referrers, devices,
              browsers, os, utm_sources, custom_events, countries
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        s.id,
        t,
        agg.pageviews,
        agg.visitors,
        JSON.stringify(agg.pages),
        JSON.stringify(agg.referrers),
        JSON.stringify(agg.devices),
        JSON.stringify(agg.browsers),
        JSON.stringify(agg.os),
        JSON.stringify(agg.utmSources),
        JSON.stringify(agg.customEvents),
        JSON.stringify(agg.countries),
      ],
    });
  }
  const chunk = 80;
  for (let i = 0; i < statements.length; i += chunk) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const statement of statements.slice(i, i + chunk)) {
        await client.query(toPg(statement.sql), statement.args);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(`stats ${s.domain}: ${statements.length} hours`);
}

const incidentStart = now - 8 * 24 * 3600 * 1000 - 46 * 60 * 1000;
const incidentEnd = now - 8 * 24 * 3600 * 1000;
await exec(
  `INSERT INTO downtimes (id, site_id, url, started_at, ended_at, last_status_code, last_error)
   VALUES (?, ?, ?, ?, ?, 503, 'upstream timeout')`,
  [
    "down_demo_uplytics",
    DEMO_SITE_MARKETING,
    `https://${DOMAIN}`,
    incidentStart,
    incidentEnd,
  ],
);
await exec(
  `INSERT INTO health_state (site_id, url, status, last_check_at, last_latency_ms, last_status_code)
   VALUES (?, ?, 'up', ?, 118, 200)
   ON CONFLICT (site_id, url) DO UPDATE SET
     status = 'up', last_check_at = excluded.last_check_at,
     last_latency_ms = excluded.last_latency_ms, last_status_code = 200`,
  [DEMO_SITE_MARKETING, `https://${DOMAIN}`, now],
);
await exec(
  `INSERT INTO health_state (site_id, url, status, last_check_at, last_latency_ms, last_status_code)
   VALUES (?, ?, 'up', ?, 94, 200)
   ON CONFLICT (site_id, url) DO UPDATE SET
     status = 'up', last_check_at = excluded.last_check_at,
     last_latency_ms = excluded.last_latency_ms, last_status_code = 200`,
  [DEMO_SITE_MARKETING, `https://${DOMAIN}/sign-in`, now],
);
await exec(
  `INSERT INTO health_state (site_id, url, status, last_check_at, last_latency_ms, last_status_code)
   VALUES (?, ?, 'up', ?, 210, 200)
   ON CONFLICT (site_id, url) DO UPDATE SET
     status = 'up', last_check_at = excluded.last_check_at,
     last_latency_ms = excluded.last_latency_ms, last_status_code = 200`,
  [DEMO_SITE_STORE, "https://example.com", now],
);

await pool.end();
console.log(`Demo workspace ready: /demo  (sites ${DEMO_SITE_MARKETING}, ${DEMO_SITE_STORE})`);
console.log(`Sample hours include about ${monthPageviews} page views.`);

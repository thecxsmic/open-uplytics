import {
  DEMO_OWNER_ID,
  DEMO_SITE_MARKETING,
  DEMO_SITE_STORE,
  DEMO_SLUG,
  DEMO_WORKSPACE_ID,
} from "./demo-ids.js";

const DOMAIN = "uplytics.space";
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function mulberry32(a) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hourSeed(siteId, bucket) {
  let n = (bucket / HOUR) ^ 0x9e3779b9;
  for (let i = 0; i < siteId.length; i++) {
    n = Math.imul(n ^ siteId.charCodeAt(i), 0x85ebca6b);
  }
  return n >>> 0;
}

function pickWeighted(rand, items) {
  const total = items.reduce((sum, item) => sum + item.w, 0);
  let n = rand() * total;
  for (const item of items) {
    n -= item.w;
    if (n <= 0) return item.v;
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
    if (rand() < 0.12) {
      bump(utm, pickWeighted(rand, [
        { v: "google", w: 50 },
        { v: "newsletter", w: 30 },
        { v: "launch", w: 20 },
      ]));
    }
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

export function demoSites() {
  return [
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
}

export function hourStart(now = Date.now()) {
  const date = new Date(now);
  date.setUTCMinutes(0, 0, 0);
  date.setUTCMilliseconds(0);
  return date.getTime();
}

function statsFor(site, bucket) {
  return hourStats(new Date(bucket), mulberry32(hourSeed(site.id, bucket)), site.base, site.pages, site.refs);
}

function hourInsert(site, bucket) {
  const agg = statsFor(site, bucket);
  return {
    sql: `INSERT INTO hourly_stats (
            site_id, hour_bucket, pageviews, visitors, pages, referrers, devices,
            browsers, os, utm_sources, custom_events, countries
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (site_id, hour_bucket) DO NOTHING`,
    args: [
      site.id,
      bucket,
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
  };
}

async function one(db, sql, args) {
  const rows = await db.query(sql, args);
  return rows?.[0] || null;
}

async function writeHours(db, statements) {
  const chunk = 80;
  for (let i = 0; i < statements.length; i += chunk) {
    await db.batch(statements.slice(i, i + chunk));
  }
}

async function ensureSampleIncident(db, now) {
  const existing = await one(db, "SELECT ended_at FROM downtimes WHERE id = ?", ["down_demo_uplytics"]);
  if (existing && Number(existing.ended_at || 0) > now - 40 * DAY) return;
  const incidentEnd = now - 8 * DAY;
  const incidentStart = incidentEnd - 46 * 60 * 1000;
  if (existing) {
    await db.query(
      "UPDATE downtimes SET started_at = ?, ended_at = ?, url = ? WHERE id = ?",
      [incidentStart, incidentEnd, `https://${DOMAIN}`, "down_demo_uplytics"],
    );
    return;
  }
  await db.query(
    `INSERT INTO downtimes (id, site_id, url, started_at, ended_at, last_status_code, last_error)
     VALUES (?, ?, ?, ?, ?, 503, 'upstream timeout')`,
    ["down_demo_uplytics", DEMO_SITE_MARKETING, `https://${DOMAIN}`, incidentStart, incidentEnd],
  );
}

export async function seedDemoWorkspace(db, { log = () => {} } = {}) {
  const now = Date.now();
  const sites = demoSites();
  try {
    await db.query("ALTER TABLE workspaces ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  } catch {
    /* already present */
  }
  try {
    await db.query("ALTER TABLE hourly_stats ADD COLUMN countries TEXT");
  } catch {
    /* already present */
  }

  await db.query(
    `INSERT INTO workspaces (id, name, slug, owner_id, created_at, is_demo)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       slug = EXCLUDED.slug,
       is_demo = 1`,
    [DEMO_WORKSPACE_ID, "Uplytics", DEMO_SLUG, DEMO_OWNER_ID, now - 40 * DAY],
  );

  for (const site of sites) {
    await db.query(
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
        site.id,
        DEMO_WORKSPACE_ID,
        site.name,
        site.domain,
        JSON.stringify(site.allowed),
        `demo-${site.id}`,
        site.slug,
        now - 35 * DAY,
      ],
    );
    await db.query("DELETE FROM site_health_urls WHERE site_id = ?", [site.id]);
    for (let i = 0; i < site.health.length; i++) {
      await db.query(
        "INSERT INTO site_health_urls (id, site_id, url, sort_order) VALUES (?, ?, ?, ?)",
        [`hu_${site.id}_${i}`, site.id, site.health[i], i],
      );
    }
    await db.query("DELETE FROM site_notification_emails WHERE site_id = ?", [site.id]);
    await db.query("DELETE FROM hourly_stats WHERE site_id = ?", [site.id]);
    await db.query("DELETE FROM downtimes WHERE site_id = ?", [site.id]);
    await db.query("DELETE FROM health_state WHERE site_id = ?", [site.id]);
    await db.query("DELETE FROM alert_email_days WHERE site_id = ?", [site.id]);
  }

  await db.query("DELETE FROM activity_log WHERE workspace_id = ?", [DEMO_WORKSPACE_ID]);
  await db.query(
    `INSERT INTO activity_log (id, workspace_id, user_id, action, meta, created_at)
     VALUES (?, ?, ?, 'workspace.created', ?, ?)`,
    ["act_demo_ws", DEMO_WORKSPACE_ID, DEMO_OWNER_ID, JSON.stringify({ name: "Uplytics" }), now - 40 * DAY],
  );

  const end = hourStart(now);
  const from = end - 30 * DAY;
  for (const site of sites) {
    const statements = [];
    for (let bucket = from; bucket < end; bucket += HOUR) statements.push(hourInsert(site, bucket));
    await writeHours(db, statements);
    log(`stats ${site.domain}: ${statements.length} hours`);
  }

  const incidentEnd = now - 8 * DAY;
  await db.query(
    `INSERT INTO downtimes (id, site_id, url, started_at, ended_at, last_status_code, last_error)
     VALUES (?, ?, ?, ?, ?, 503, 'upstream timeout')`,
    ["down_demo_uplytics", DEMO_SITE_MARKETING, `https://${DOMAIN}`, incidentEnd - 46 * 60 * 1000, incidentEnd],
  );
  const checks = [
    [DEMO_SITE_MARKETING, `https://${DOMAIN}`, 118],
    [DEMO_SITE_MARKETING, `https://${DOMAIN}/sign-in`, 94],
    [DEMO_SITE_STORE, "https://example.com", 210],
  ];
  for (const [siteId, url, latency] of checks) {
    await db.query(
      `INSERT INTO health_state (site_id, url, status, last_check_at, last_latency_ms, last_status_code)
       VALUES (?, ?, 'up', ?, ?, 200)
       ON CONFLICT (site_id, url) DO UPDATE SET
         status = 'up', last_check_at = excluded.last_check_at,
         last_latency_ms = excluded.last_latency_ms, last_status_code = 200`,
      [siteId, url, now, latency],
    );
  }

  log(`Demo workspace ready: /demo  (sites ${DEMO_SITE_MARKETING}, ${DEMO_SITE_STORE})`);
  return { seeded: true, mode: "full" };
}

async function topUpDemo(db, sites, now) {
  const end = hourStart(now);
  const windowStart = end - 30 * DAY;
  let hours = 0;
  for (const site of sites) {
    const latest = await one(
      db,
      "SELECT MAX(hour_bucket) AS mx FROM hourly_stats WHERE site_id = ?",
      [site.id],
    );
    const mx = Number(latest?.mx || 0);
    const start = mx ? Math.max(windowStart, mx + HOUR) : windowStart;
    const statements = [];
    for (let bucket = start; bucket < end; bucket += HOUR) statements.push(hourInsert(site, bucket));
    if (statements.length) await writeHours(db, statements);
    hours += statements.length;
    await db.query(
      "DELETE FROM hourly_stats WHERE site_id = ? AND hour_bucket < ?",
      [site.id, windowStart],
    );
  }
  await ensureSampleIncident(db, now);
  return { seeded: true, mode: "topup", hours };
}

export async function ensureDemoData(db) {
  const sites = demoSites();
  const now = Date.now();
  const workspace = await one(db, "SELECT id FROM workspaces WHERE id = ?", [DEMO_WORKSPACE_ID]);
  const primary = await one(db, "SELECT id FROM sites WHERE id = ?", [sites[0].id]);
  if (!workspace || !primary) return seedDemoWorkspace(db);
  const latest = await one(
    db,
    "SELECT MAX(hour_bucket) AS mx FROM hourly_stats WHERE site_id = ?",
    [sites[0].id],
  );
  const mx = Number(latest?.mx || 0);
  if (mx >= hourStart(now) - HOUR) return { seeded: false, latest: mx };
  return topUpDemo(db, sites, now);
}

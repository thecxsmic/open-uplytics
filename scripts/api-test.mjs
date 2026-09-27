#!/usr/bin/env node
// executable via: npm run test:api
/**
 * End-to-end HTTP tests for every Uplitycs API route.
 *
 * Prerequisites:
 *   1. cp .env.example .env  and fill required keys
 *   2. npm run db:push
 *   3. npm run dev   (or pass --start)
 *
 * Usage:
 *   npm run test:api
 *   npm run test:api -- --start
 *   npm run test:api -- --keep
 */
import { spawn } from "child_process";
import {
  ROOT,
  baseUrl,
  loadProjectEnv,
  missingRequiredEnv,
} from "./load-env.mjs";
import { createDb, exec as pgExec } from "./pg.mjs";

loadProjectEnv();

const KEEP = process.argv.includes("--keep") || process.env.API_TEST_KEEP === "1";
const START = process.argv.includes("--start");
const BASE = baseUrl();
const STAMP = Date.now().toString(36);
const PASSWORD = process.env.API_TEST_PASSWORD || "test-pass-123";
const EMAIL_A = process.env.API_TEST_EMAIL || `apitest.a.${STAMP}@example.com`;
const EMAIL_B = process.env.API_TEST_EMAIL_B || `apitest.b.${STAMP}@example.com`;

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;
let serverChild = null;
let pool;
const created = {
  userIds: [],
  workspaceIds: [],
  siteIds: [],
};

class CookieJar {
  constructor() {
    this.store = new Map();
  }
  absorb(res) {
    const list =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];
    for (const c of list) {
      const [nv, ...attrs] = c.split(";");
      const eq = nv.indexOf("=");
      if (eq < 0) continue;
      const name = nv.slice(0, eq).trim();
      const value = nv.slice(eq + 1);
      const joined = attrs.join(";").toLowerCase();
      if (joined.includes("max-age=0") || joined.includes("expires=thu, 01 jan 1970")) {
        this.store.delete(name);
      } else {
        this.store.set(name, value);
      }
    }
  }
  header() {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

function record(name, status, detail = "") {
  const row = { name, status, detail };
  results.push(row);
  const tag = status === "pass" ? "PASS" : status === "skip" ? "SKIP" : "FAIL";
  if (status === "pass") passed += 1;
  else if (status === "skip") skipped += 1;
  else failed += 1;
  const extra = detail ? `  ${detail}` : "";
  console.log(`${tag.padEnd(4)} ${name}${extra}`);
}

function expectStatus(got, expected) {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.includes(got);
}

async function request(jar, method, path, { json, form, headers = {}, raw } = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const h = { ...headers };
  const cookie = jar?.header();
  if (cookie) h.cookie = cookie;
  if (jar?.bearer && !h.authorization && !h.Authorization) {
    h.authorization = `Bearer ${jar.bearer}`;
  }
  let body;
  if (json !== undefined) {
    h["content-type"] = h["content-type"] || "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    h["content-type"] = "application/x-www-form-urlencoded";
    body = form instanceof URLSearchParams ? form.toString() : form;
  } else if (raw !== undefined) {
    body = raw;
  }
  const res = await fetch(url, {
    method,
    headers: h,
    body,
    redirect: "manual",
  });
  jar?.absorb(res);
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { res, status: res.status, text, json: parsed, headers: res.headers };
}

async function call(name, jar, method, path, opts, expected, check) {
  try {
    const result = await request(jar, method, path, opts);
    if (!expectStatus(result.status, expected)) {
      const body = result.text?.slice(0, 240)?.replace(/\s+/g, " ") || "";
      record(name, "fail", `expected ${expected} got ${result.status} ${body}`);
      return result;
    }
    if (check) {
      const msg = await check(result);
      if (msg) {
        record(name, "fail", msg);
        return result;
      }
    }
    record(name, "pass", `${method} ${path} → ${result.status}`);
    return result;
  } catch (err) {
    record(name, "fail", err.message);
    return null;
  }
}

async function tquery(sql, args = []) {
  const rs = await pgExec(pool, sql, args);
  return rs.rows;
}

async function texecute(sql, args = []) {
  return pgExec(pool, sql, args);
}

async function waitForServer(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/sign-in`, { redirect: "manual" });
      if (res.ok || res.status === 200) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function maybeStartServer() {
  const up = await waitForServer(1500);
  if (up) return;
  if (!START) {
    throw new Error(
      `No server at ${BASE}. Start it with \`npm run dev\` or re-run with --start`,
    );
  }
  console.log(`Starting next dev on ${BASE} …`);
  const port = new URL(BASE).port || "3000";
  serverChild = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverChild.stdout.on("data", (buf) => {
    const s = buf.toString();
    if (process.env.API_TEST_VERBOSE === "1") process.stdout.write(s);
  });
  serverChild.stderr.on("data", (buf) => {
    const s = buf.toString();
    if (process.env.API_TEST_VERBOSE === "1") process.stderr.write(s);
  });
  const ready = await waitForServer(90_000);
  if (!ready) throw new Error("Timed out waiting for next dev");
}

async function createTestUser(jar, email, name) {
  const res = await request(jar, "POST", "/api/auth/sign-up", {
    json: { email, name, password: PASSWORD },
  });
  if (res.status !== 200 || !res.json?.id) {
    throw new Error(res.json?.error || `sign-up failed (${res.status})`);
  }
  created.userIds.push(res.json.id);
  return res.json;
}

async function markSiteVerified(siteId) {
  await texecute("UPDATE sites SET verified = 1 WHERE id = ?", [siteId]);
}

async function cleanup() {
  if (KEEP) {
    console.log("\n--keep set; leaving test rows in place");
    return;
  }
  try {
    for (const siteId of created.siteIds) {
      await texecute("DELETE FROM site_health_urls WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM site_notification_emails WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM hourly_stats WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM downtimes WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM health_state WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM alert_email_days WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM hourly_buckets WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM live_pings WHERE site_id = ?", [siteId]);
      await texecute("DELETE FROM sites WHERE id = ?", [siteId]);
    }
    for (const wsId of created.workspaceIds) {
      await texecute("DELETE FROM activity_log WHERE workspace_id = ?", [wsId]);
      await texecute("DELETE FROM workspaces WHERE id = ?", [wsId]);
    }
    for (const userId of created.userIds) {
      const owned = await tquery("SELECT id FROM workspaces WHERE owner_id = ?", [userId]);
      for (const ws of owned) {
        const sites = await tquery("SELECT id FROM sites WHERE workspace_id = ?", [ws.id]);
        for (const site of sites) {
          await texecute("DELETE FROM site_health_urls WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM site_notification_emails WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM hourly_stats WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM hourly_buckets WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM live_pings WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM downtimes WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM health_state WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM alert_email_days WHERE site_id = ?", [site.id]);
          await texecute("DELETE FROM sites WHERE id = ?", [site.id]);
        }
        await texecute("DELETE FROM activity_log WHERE workspace_id = ?", [ws.id]);
        await texecute("DELETE FROM workspaces WHERE id = ?", [ws.id]);
      }
      await texecute("DELETE FROM sessions WHERE account_id = ?", [userId]);
      await texecute("DELETE FROM password_resets WHERE account_id = ?", [userId]);
      await texecute("DELETE FROM account_recovery_codes WHERE account_id = ?", [userId]);
      await texecute("DELETE FROM activity_log WHERE user_id = ?", [userId]);
      await texecute("DELETE FROM accounts WHERE id = ?", [userId]);
    }
  } catch (err) {
    console.warn("cleanup warning:", err.message);
  }
}

function stopServer() {
  if (!serverChild) return;
  try {
    serverChild.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

async function main() {
  console.log(`Uplitycs API tests → ${BASE}\n`);

  const missing = missingRequiredEnv();
  if (missing.length) {
    console.error("Missing required env:", missing.join(", "));
    console.error("Copy .env.example to .env, fill values, then: npm run check:env");
    process.exitCode = 1;
    return;
  }

  pool = createDb();

  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("Postgres is not reachable:", err.message);
    console.error("Run: npm run db:push");
    process.exitCode = 1;
    return;
  }

  await maybeStartServer();
  try {
    await runSuite();
  } finally {
    await cleanup();
  }

  console.log(
    `\n${passed} passed, ${failed} failed, ${skipped} skipped  (${results.length} checks)`,
  );
  if (failed) process.exitCode = 1;
}

async function runSuite() {
  const anon = new CookieJar();
  const jarA = new CookieJar();

  // --- public pages / static ---
  await call("GET /", anon, "GET", "/", {}, [200, 307, 308]);
  await call("GET /sign-in", anon, "GET", "/sign-in", {}, 200);
  await call("GET /sign-up", anon, "GET", "/sign-up", {}, 200);
  await call("GET /login redirect", anon, "GET", "/login", {}, [307, 308]);
  await call("GET /signup redirect", anon, "GET", "/signup", {}, [307, 308]);
  await call(
    "GET /uplitycs.js",
    anon,
    "GET",
    "/uplitycs.js",
    {},
    200,
    (r) => (r.text && r.text.length > 200 ? null : "tracker too small"),
  );

  await call(
    "POST /api/auth/sign-in empty",
    anon,
    "POST",
    "/api/auth/sign-in",
    { json: {} },
    401,
  );

  // --- unauthenticated API guards ---
  await call("GET /api/workspaces unauth", anon, "GET", "/api/workspaces", {}, 401);
  await call(
    "POST /api/workspaces unauth",
    anon,
    "POST",
    "/api/workspaces",
    { json: { name: "nope" } },
    401,
  );
  await call(
    "POST /api/sites unauth",
    anon,
    "POST",
    "/api/sites",
    { json: { name: "x", domain: "x.com", workspaceId: "ws_x" } },
    401,
  );
  await call(
    "GET /api/cron/hourly no secret",
    anon,
    "GET",
    "/api/cron/hourly",
    {},
    401,
  );
  await call(
    "GET /api/cron/health-check no secret",
    anon,
    "GET",
    "/api/cron/health-check",
    {},
    401,
  );
  await call(
    "GET /api/cron/daily no secret",
    anon,
    "GET",
    "/api/cron/daily",
    {},
    401,
  );
  await call(
    "GET /api/status/missing",
    anon,
    "GET",
    "/api/status/does-not-exist",
    {},
    404,
  );
  await call("GET /api/demo", anon, "GET", "/api/demo", {}, [200, 404]);
  await call("GET /demo", anon, "GET", "/demo", {}, 200);

  // --- collect CORS + validation ---
  await call("OPTIONS /api/collect", anon, "OPTIONS", "/api/collect", {}, 204);
  await call("OPTIONS /u/collect", anon, "OPTIONS", "/u/collect", {}, 204);
  await call(
    "POST /api/collect missing fields",
    anon,
    "POST",
    "/api/collect",
    { json: {} },
    400,
  );
  await call(
    "POST /api/collect unknown site",
    anon,
    "POST",
    "/api/collect",
    {
      json: {
        siteId: "site_does_not_exist",
        events: [{ n: "pageview", path: "/", ts: Date.now() }],
      },
    },
    404,
  );
  await call(
    "POST /api/collect invalid json",
    anon,
    "POST",
    "/api/collect",
    { raw: "not-json", headers: { "content-type": "application/json" } },
    400,
  );

  let userA;
  try {
    userA = await createTestUser(jarA, EMAIL_A, "Api Tester A");
    record("Sign up A", "pass", userA.id);
  } catch (err) {
    record("Sign up A", "fail", err.message);
    console.error("Account A failed; remaining authenticated tests will fail.");
  }

  // --- workspaces ---
  const listWs = await call(
    "GET /api/workspaces",
    jarA,
    "GET",
    "/api/workspaces",
    {},
    200,
    (r) => (Array.isArray(r.json?.workspaces) && r.json.workspaces.length ? null : "no workspaces"),
  );
  const workspaceId = listWs?.json?.workspaces?.[0]?.id;
  if (workspaceId && !created.workspaceIds.includes(workspaceId)) {
    created.workspaceIds.push(workspaceId);
  }

  await call(
    "GET /api/workspaces/:id",
    jarA,
    "GET",
    `/api/workspaces/${workspaceId}`,
    {},
    200,
    (r) => (r.json?.workspace ? null : "workspace missing"),
  );
  await call(
    "PATCH /api/workspaces/:id",
    jarA,
    "PATCH",
    `/api/workspaces/${workspaceId}`,
    { json: { name: "Api Test Workspace" } },
    200,
  );
  const secondWs = await call(
    "POST /api/workspaces another website",
    jarA,
    "POST",
    "/api/workspaces",
    { json: { name: "Second Website" } },
    200,
    (r) => (r.json?.id ? null : "workspace id missing"),
  );
  if (secondWs?.json?.id) created.workspaceIds.push(secondWs.json.id);
  await call(
    "POST /api/workspaces missing name",
    jarA,
    "POST",
    "/api/workspaces",
    { json: {} },
    400,
  );
  await call(
    "GET /api/workspaces/:id/activity",
    jarA,
    "GET",
    `/api/workspaces/${workspaceId}/activity`,
    {},
    200,
    (r) => (Array.isArray(r.json?.activity) ? null : "activity missing"),
  );
  // --- sites ---
  await call(
    "POST /api/sites missing fields",
    jarA,
    "POST",
    "/api/sites",
    { json: { workspaceId } },
    400,
  );
  const siteRes = await call(
    "POST /api/sites",
    jarA,
    "POST",
    "/api/sites",
    {
      json: {
        workspaceId,
        name: "Example",
        domain: "example.com",
        allowedDomains: ["example.com"],
        bypassOrigin: false,
        healthUrls: ["https://example.com", "https://example.com/404-uplitycs-test"],
        notificationEmails: [EMAIL_A, EMAIL_B],
      },
    },
    200,
    (r) => (r.json?.site?.id ? null : "site id missing"),
  );
  const siteId = siteRes?.json?.site?.id;
  const statusSlug = siteRes?.json?.site?.statusSlug;
  if (siteId) created.siteIds.push(siteId);

  if (siteId) {
    await call(
      "GET /api/sites/:id",
      jarA,
      "GET",
      `/api/sites/${siteId}`,
      {},
      200,
      (r) => {
        if (r.json?.site?.id !== siteId) return "site mismatch";
        if ((r.json?.healthUrls || []).length !== 2) return "both uptime urls should be kept";
        if ((r.json?.notificationEmails || []).length !== 2) return "both alert emails should be kept";
        return null;
      },
    );
    await call(
      "PATCH /api/sites/:id",
      jarA,
      "PATCH",
      `/api/sites/${siteId}`,
      {
        json: {
          name: "Example Site",
          bypassOrigin: false,
          healthUrls: ["https://example.com"],
          notificationEmails: [EMAIL_A],
        },
      },
      200,
    );
    await call(
      "GET /api/sites/:id/analytics empty",
      jarA,
      "GET",
      `/api/sites/${siteId}/analytics?range=7d`,
      {},
      200,
      (r) => (typeof r.json?.pageviews === "number" ? null : "pageviews missing"),
    );
    await call(
      "GET /api/sites/:id/uptime",
      jarA,
      "GET",
      `/api/sites/${siteId}/uptime`,
      {},
      200,
    );
    await call(
      "POST /api/sites/:id/verify (unverified domain)",
      jarA,
      "POST",
      `/api/sites/${siteId}/verify`,
      {},
      400,
    );

    await call(
      "POST /api/collect first event verifies the site",
      anon,
      "POST",
      "/api/collect",
      {
        json: {
          siteId,
          events: [{ n: "pageview", path: "/", vid: "v1", ts: Date.now() }],
        },
        headers: { origin: "https://example.com" },
      },
      204,
    );

    await markSiteVerified(siteId);
    record("mark site verified (Turso + SiteHot)", "pass", siteId);

    const skipOrigin =
      process.env.COLLECT_SKIP_ORIGIN === "1" ||
      process.env.ALLOWED_DOMAINS_BYPASS === "1";

    await call(
      "POST /api/collect origin denied",
      anon,
      "POST",
      "/api/collect",
      {
        json: {
          siteId,
          events: [{ n: "pageview", path: "/evil", vid: "v-evil", ts: Date.now() }],
        },
        headers: { origin: "https://evil.example" },
      },
      skipOrigin ? 204 : 403,
    );

    await call(
      "POST /api/collect pageview",
      anon,
      "POST",
      "/api/collect",
      {
        json: {
          siteId,
          events: [
            {
              n: "pageview",
              path: "/",
              vid: "vid-api-test",
              sid: "sid-api-test",
              d: "d",
              b: "chrome",
              os: "linux",
              ts: Date.now(),
            },
            {
              n: "signup",
              path: "/signup",
              vid: "vid-api-test",
              props: { source: "docs" },
              ts: Date.now(),
            },
          ],
        },
        headers: { origin: "https://example.com" },
      },
      204,
    );
    await call(
      "POST /u/collect rewrite",
      anon,
      "POST",
      "/u/collect",
      {
        json: {
          siteId,
          events: [{ n: "pageview", path: "/rewrite", vid: "vid-rw", ts: Date.now() }],
        },
        headers: { origin: "https://example.com" },
      },
      204,
    );
    await call(
      "GET /api/sites/:id/analytics after ingest",
      jarA,
      "GET",
      `/api/sites/${siteId}/analytics?range=24h`,
      {},
      200,
    );

    await call(
      "POST /api/health-check",
      jarA,
      "POST",
      "/api/health-check",
      { json: { siteId } },
      200,
      (r) => (r.json?.ok ? null : "expected ok"),
    );
    await call(
      "POST /api/health-check missing siteId",
      jarA,
      "POST",
      "/api/health-check",
      { json: {} },
      400,
    );

    if (statusSlug) {
      await call(
        "GET /api/status/:slug",
        anon,
        "GET",
        `/api/status/${statusSlug}`,
        {},
        200,
        (r) => (r.json?.site?.domain ? null : "status payload missing"),
      );
    }
  }

  // --- crons (authorized) ---
  const cronHeaders = { "x-cron-secret": process.env.CRON_SECRET };
  await call(
    "GET /api/cron/hourly",
    anon,
    "GET",
    "/api/cron/hourly",
    { headers: cronHeaders },
    200,
    (r) => (r.json?.ok ? null : "expected ok"),
  );
  await call(
    "POST /api/cron/hourly",
    anon,
    "POST",
    "/api/cron/hourly",
    { headers: cronHeaders },
    200,
  );
  await call(
    "GET /api/cron/health-check",
    anon,
    "GET",
    "/api/cron/health-check",
    { headers: cronHeaders },
    200,
    (r) => (r.json?.ok ? null : "expected ok"),
  );
  await call(
    "GET /api/cron/daily",
    anon,
    "GET",
    "/api/cron/daily",
    { headers: cronHeaders },
    200,
    (r) => (r.json?.ok ? null : "expected ok"),
  );
  await call(
    "GET /api/cron/hourly wrong secret",
    anon,
    "GET",
    "/api/cron/hourly",
    { headers: { "x-cron-secret": "definitely-wrong-secret-value" } },
    401,
  );
  await call(
    "POST /api/health-check via cron secret",
    anon,
    "POST",
    "/api/health-check",
    {
      json: { siteId: siteId || "site_x" },
      headers: cronHeaders,
    },
    siteId ? 200 : [200, 404, 400],
  );

  // --- dashboard gate ---
  await call(
    "GET /d unauth redirect",
    anon,
    "GET",
    "/d",
    {},
    [307, 308, 302],
  );
  await call(
    "GET /dashboard redirects to /d",
    anon,
    "GET",
    "/dashboard",
    {},
    [307, 308, 302],
  );

  // --- destructive cleanup via API ---
  if (siteId && !KEEP) {
    await call(
      "DELETE /api/sites/:id",
      jarA,
      "DELETE",
      `/api/sites/${siteId}`,
      {},
      200,
    );
    created.siteIds = created.siteIds.filter((id) => id !== siteId);
  }
  if (workspaceId && !KEEP) {
    await call(
      "DELETE /api/workspaces/:id",
      jarA,
      "DELETE",
      `/api/workspaces/${workspaceId}`,
      {},
      200,
    );
    created.workspaceIds = created.workspaceIds.filter((id) => id !== workspaceId);
  }
}

process.on("exit", stopServer);
process.on("SIGINT", () => {
  stopServer();
  process.exit(130);
});

try {
  await main();
} catch (err) {
  console.error("\nFatal:", err.message);
  process.exitCode = 1;
} finally {
  try {
    await pool?.end();
  } catch {
    /* ignore */
  }
  stopServer();
}

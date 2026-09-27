#!/usr/bin/env node
import { loadProjectEnv, missingRequiredEnv, OPTIONAL_ENV, REQUIRED_ENV, baseUrl } from "./load-env.mjs";
import { createDb } from "./pg.mjs";

loadProjectEnv();

let failed = 0;
function ok(msg) {
  console.log(`  ok   ${msg}`);
}
function warn(msg) {
  console.log(`  warn ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.log(`  fail ${msg}`);
}

console.log("Open Uplitycs env check\n");
console.log("Required:");
for (const key of REQUIRED_ENV) {
  const val = String(process.env[key] || "").trim();
  if (!val) fail(`${key} is missing`);
  else if (key === "AUTH_SECRET" && val.length < 16) fail(`${key} must be at least 16 characters`);
  else ok(`${key} is set`);
}

console.log("\nOptional:");
for (const key of OPTIONAL_ENV) {
  const val = String(process.env[key] || "").trim();
  if (!val) warn(`${key} is empty`);
  else ok(`${key} is set`);
}

console.log(`\nApp URL: ${baseUrl()}`);

if (!missingRequiredEnv().includes("DATABASE_URL")) {
  console.log("\nPostgres:");
  const pool = createDb();
  try {
    await pool.query("SELECT 1 AS ok");
    const tables = await pool.query(
      "SELECT to_regclass('public.workspaces') AS name",
    );
    if (!tables.rows[0]?.name) fail("connected, but schema is missing — run: npm run db:push");
    else ok("connected and workspaces table exists");
  } catch (err) {
    fail(`connection failed: ${err.message}`);
  } finally {
    await pool.end();
  }
}

if (failed) process.exit(1);

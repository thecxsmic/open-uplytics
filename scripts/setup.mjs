#!/usr/bin/env node
/**
 * One command after clone: write .env, start Postgres, create tables, seed /demo.
 *   npm run setup
 *   npm run setup -- --no-demo
 */
import { randomBytes } from "crypto";
import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import pg from "pg";
import { ROOT } from "./load-env.mjs";

const noDemo = process.argv.includes("--no-demo");
const envPath = join(ROOT, ".env");
const examplePath = join(ROOT, ".env.example");

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function ensureEnv() {
  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) fail("Missing .env.example");
    writeFileSync(envPath, readFileSync(examplePath, "utf8"));
    console.log("Created .env from .env.example");
  }
  let text = readFileSync(envPath, "utf8");
  const fill = (key, value) => {
    const pattern = new RegExp(`^(${key}=).*$`, "m");
    if (!pattern.test(text)) {
      text += `\n${key}=${value}\n`;
      return true;
    }
    const current = text.match(pattern)[0].slice(key.length + 1).trim();
    const empty = !current || current === "replace-with-cron-secret";
    if (!empty) return false;
    text = text.replace(pattern, `$1${value}`);
    return true;
  };
  const wroteSecret = fill("AUTH_SECRET", randomBytes(32).toString("hex"));
  const wroteCron = fill("CRON_SECRET", randomBytes(24).toString("hex"));
  if (!/^COLLECT_SKIP_ORIGIN=/m.test(text)) text += "\nCOLLECT_SKIP_ORIGIN=1\n";
  else {
    text = text.replace(/^COLLECT_SKIP_ORIGIN=.*$/m, "COLLECT_SKIP_ORIGIN=1");
  }
  writeFileSync(envPath, text);
  if (wroteSecret) console.log("Filled AUTH_SECRET");
  if (wroteCron) console.log("Filled CRON_SECRET");
  console.log("Origin checks are off for this local .env (COLLECT_SKIP_ORIGIN=1)");
}

function databaseUrl() {
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((row) => row.startsWith("DATABASE_URL="));
  return line ? line.slice("DATABASE_URL=".length).trim() : "";
}

async function canConnect(url) {
  const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 2000 });
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

function startDocker() {
  const compose = spawnSync("docker", ["compose", "up", "-d", "--wait"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (compose.error) {
    fail("Docker is not installed. Install Docker, or point DATABASE_URL at a Postgres you already run, then run npm run setup again.");
  }
  if (compose.status !== 0) {
    fail("Postgres did not start. Check Docker, then run npm run setup again.");
  }
}

function runNode(script) {
  const child = spawnSync(process.execPath, [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (child.status !== 0) fail(`${script} failed`);
}

ensureEnv();
const url = databaseUrl();
if (!url) fail("DATABASE_URL is missing from .env");

if (await canConnect(url)) {
  console.log("Postgres is already reachable");
} else {
  console.log("Starting Postgres with Docker…");
  startDocker();
  let ready = false;
  for (let i = 0; i < 30 && !ready; i++) {
    ready = await canConnect(url);
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) fail("Postgres is up in Docker, but DATABASE_URL still does not connect.");
}

runNode("migrate.mjs");
if (!noDemo) runNode("seed-demo.mjs");

console.log(`
Ready.

  npm run dev

Then open http://localhost:3000
Sign in to create a site, or open http://localhost:3000/demo for the sample dashboard.
`);

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return false;
  const text = readFileSync(filePath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = cleaned.indexOf("=");
    if (eq < 1) continue;
    const key = cleaned.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] != null && process.env[key] !== "") continue;
    let val = cleaned.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  return true;
}

export function loadProjectEnv() {
  loadEnvFile(join(ROOT, ".env.local"));
  loadEnvFile(join(ROOT, ".env"));
}

export const REQUIRED_ENV = ["AUTH_SECRET", "DATABASE_URL", "CRON_SECRET"];

export const OPTIONAL_ENV = [
  "APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "COLLECT_SKIP_ORIGIN",
  "ALLOWED_DOMAINS_BYPASS",
];

const PLACEHOLDER_ENV = {
  CRON_SECRET: "replace-with-cron-secret",
};

export function envGap(key) {
  const value = String(process.env[key] || "").trim();
  if (!value || value === PLACEHOLDER_ENV[key]) return "is not there";
  if (key === "AUTH_SECRET" && value.length < 16) return "is shorter than 16 characters";
  return "";
}

export function missingRequiredEnv() {
  return REQUIRED_ENV.filter((key) => envGap(key) === "is not there");
}

export function baseUrl() {
  return (
    process.env.API_TEST_BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function nowMs() {
  return Date.now();
}

export function hourBucketUtc(ts = Date.now()) {
  const d = new Date(ts);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export function monthKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function slugify(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function originHost(origin) {
  if (!origin) return "";
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return String(origin)
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .split(":")[0]
      .toLowerCase();
  }
}

export function domainMatches(host, allowed) {
  if (!host || !allowed?.length) return false;
  return allowed.some((rule) => {
    const r = String(rule)
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .split("/")[0];
    if (r.startsWith("*.")) {
      const base = r.slice(2);
      return host === base || host.endsWith("." + base);
    }
    return host === r || host === "www." + r || "www." + host === r;
  });
}

export function threeMonthsAgoMs(ts = Date.now()) {
  const d = new Date(ts);
  d.setUTCMonth(d.getUTCMonth() - 3);
  return d.getTime();
}

export function appUrl() {
  return (
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  );
}

export function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(n || 0);
}

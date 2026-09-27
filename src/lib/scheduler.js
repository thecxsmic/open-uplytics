import { readCronJobs, withCronLock } from "@/lib/cron-lock";
import { runDailyPurge } from "@/lib/daily-cron";
import { runHealthChecks } from "@/lib/health-cron";
import { runHourlyTransfer } from "@/lib/hourly-cron";
import { hourBucketUtc } from "@/lib/utils";

const HEALTH_MS = 10 * 60 * 1000;

export function schedulerMode() {
  if (process.env.VERCEL) return "vercel";
  if (process.env.CRON_INTERNAL === "0") return "external";
  return "internal";
}

function lastDailySlot(now) {
  const slot = new Date(now);
  slot.setUTCHours(3, 15, 0, 0);
  if (slot.getTime() > now) slot.setUTCDate(slot.getUTCDate() - 1);
  return slot.getTime();
}

export function jobDue(name, lastFinished, now = Date.now()) {
  const finished = Number(lastFinished) || 0;
  if (name === "health") return !finished || now - finished >= HEALTH_MS;
  if (name === "hourly") return !finished || finished < hourBucketUtc(now).getTime();
  if (name === "daily") return !finished || finished < lastDailySlot(now);
  return false;
}

const RUNNERS = {
  health: runHealthChecks,
  hourly: runHourlyTransfer,
  daily: runDailyPurge,
};

async function runDue() {
  const rows = await readCronJobs().catch(() => []);
  const finished = Object.fromEntries(rows.map((row) => [row.name, row.last_finished_at]));
  const now = Date.now();
  for (const name of Object.keys(RUNNERS)) {
    if (!jobDue(name, finished[name], now)) continue;
    try {
      const result = await withCronLock(name, RUNNERS[name]);
      if (!result?.skipped) console.log(`[cron] ${name}`, result);
    } catch (error) {
      console.error(`[cron] ${name} failed`, error);
    }
  }
}

export function startScheduler() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (schedulerMode() !== "internal") return;
  if (!process.env.DATABASE_URL) return;
  if (globalThis.__uplCronStarted) return;
  globalThis.__uplCronStarted = true;

  let ticking = false;
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      await runDue();
    } catch (error) {
      console.error("[cron] tick failed", error);
    } finally {
      ticking = false;
    }
  };

  const timer = setInterval(tick, 60_000);
  if (typeof timer.unref === "function") timer.unref();
  const first = setTimeout(tick, 15_000);
  if (typeof first.unref === "function") first.unref();
  console.log("[cron] built-in scheduler started");
}

import { cronAuthorized } from "@/lib/cron-auth";
import { readCronJobs } from "@/lib/cron-lock";
import { jobDue, schedulerMode } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await readCronJobs();
  const now = Date.now();
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  const jobs = ["health", "hourly", "daily"].map((name) => {
    const row = byName[name] || {};
    return {
      name,
      lastStartedAt: row.last_started_at || null,
      lastFinishedAt: row.last_finished_at || null,
      ok: row.last_ok == null ? null : Boolean(row.last_ok),
      error: row.last_error || null,
      due: jobDue(name, row.last_finished_at, now),
    };
  });
  return Response.json({ mode: schedulerMode(), jobs });
}

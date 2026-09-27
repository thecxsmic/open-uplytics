import { cronAuthorized } from "@/lib/cron-auth";
import { withCronLock } from "@/lib/cron-lock";
import { runDailyPurge } from "@/lib/daily-cron";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  if (!cronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await withCronLock("daily", runDailyPurge);
    if (result?.skipped) return Response.json({ ok: true, ...result });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message || "cron failed" }, { status: 500 });
  }
}

export const POST = GET;

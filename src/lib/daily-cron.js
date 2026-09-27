import { texecute } from "@/lib/db";
import { threeMonthsAgoMs } from "@/lib/utils";

export async function runDailyPurge() {
  const cutoff = threeMonthsAgoMs();
  await texecute(
    `DELETE FROM downtimes WHERE started_at < ? AND ended_at IS NOT NULL`,
    [cutoff],
  );
  await texecute(`DELETE FROM activity_log WHERE created_at < ?`, [
    Date.now() - 180 * 24 * 3600 * 1000,
  ]);
  return { purgedBefore: cutoff };
}

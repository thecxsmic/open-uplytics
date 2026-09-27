import pLimit from "p-limit";
import { loadHealthTargets, checkSiteHealth } from "@/lib/health";

export async function runHealthChecks({ concurrency = 8 } = {}) {
  const sites = await loadHealthTargets();
  const limit = pLimit(concurrency);
  const jobs = sites.map((s) =>
    limit(() => checkSiteHealth(s.site_id).catch((err) => ({ error: err.message, siteId: s.site_id }))),
  );
  const results = await Promise.allSettled(jobs);
  return {
    dispatched: sites.length,
    settled: results.length,
  };
}

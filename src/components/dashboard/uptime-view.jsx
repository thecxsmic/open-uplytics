"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Bone, Group, PrimaryButton, RowsSkeleton } from "@/components/dashboard/ios";
import { useCachedGet } from "@/lib/use-cached-get";
import { UptimeBar } from "@/components/uptime-bar";

export function UptimeView({ siteId, canRun, endpoint }) {
  const { data, reload } = useCachedGet(endpoint || (siteId ? `/api/sites/${siteId}/uptime` : null));
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch("/api/health-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    const json = await res.json().catch(() => ({}));
    if (json.skipped && json.reason !== "no urls") {
      toast.message("Checks start after the first visit.");
    }
    try {
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Bone className="mb-4 h-12 w-full rounded-2xl" />
        <Group title="Last 90 days" busy>
          <RowsSkeleton count={2} />
          <div className="px-4 py-3">
            <Bone className="h-8 w-full" />
          </div>
        </Group>
      </div>
    );
  }

  const pages = data.urls || [];

  return (
    <div>
      {canRun && pages.length > 0 ? (
        <PrimaryButton className="mb-4" icon={RefreshCw} onClick={run} busy={busy}>
          Run check
        </PrimaryButton>
      ) : null}
      {pages.length === 0 ? (
        <Group
          footer="Add pages to check in site settings."
        >
          <p className="px-4 py-4 text-[15px] text-zinc-500">No pages to check yet.</p>
        </Group>
      ) : (
        <Group title="Last 90 days">
          {pages.map((url) => {
            const state = (data.state || []).find((item) => item.url === url);
            const up = state?.status !== "down";
            return (
              <div key={url} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px]">{url}</p>
                  <span className={`shrink-0 text-[13px] font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
                    {up ? "Up" : "Down"}
                  </span>
                </div>
                <div className="mt-3">
                  <UptimeBar downtimes={data.downtimes} url={url} from={data.from} />
                </div>
                <p className="mt-2 text-[12px] text-zinc-500">
                  Last check {state?.last_check_at ? new Date(state.last_check_at).toLocaleString() : "never"}
                  {state?.last_latency_ms != null ? ` · ${state.last_latency_ms} ms` : ""}
                  {state?.last_status_code ? ` · HTTP ${state.last_status_code}` : ""}
                </p>
              </div>
            );
          })}
        </Group>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { Bone, Segmented, Screen } from "@/components/dashboard/ios";
import { useCachedGet } from "@/lib/use-cached-get";
import { UptimeView } from "@/components/dashboard/uptime-view";

export default function DemoSitePage() {
  const { siteId } = useParams();
  const { data: site } = useCachedGet(siteId ? `/api/demo/sites/${siteId}` : null);
  const [tab, setTab] = useState("analytics");

  return (
    <DashboardShell demo>
      <Screen
        wide
        title={site ? site.site?.name || "Site" : <Bone className="h-9 w-40" />}
        subtitle={site ? site.site?.domain || "Demo site" : <Bone className="h-4 w-28" />}
        action={
          site?.site?.status_slug ? (
            <Link
              href={`/status/${site.site.status_slug}`}
              target="_blank"
              className="ios-press inline-flex min-h-11 items-center text-[17px] text-zinc-300"
            >
              Status
            </Link>
          ) : null
        }
      >
        <DemoBanner />
        <div className="mb-4">
          <Segmented
            id="demo-site"
            label="Site sections"
            value={tab}
            onChange={setTab}
            options={[
              { value: "analytics", label: "Analytics" },
              { value: "uptime", label: "Uptime" },
            ]}
          />
        </div>
        {tab === "analytics" ? (
          <AnalyticsView siteId={siteId} endpoint={`/api/demo/sites/${siteId}/analytics`} />
        ) : (
          <UptimeView siteId={siteId} canRun={false} endpoint={`/api/demo/sites/${siteId}/uptime`} />
        )}
      </Screen>
    </DashboardShell>
  );
}

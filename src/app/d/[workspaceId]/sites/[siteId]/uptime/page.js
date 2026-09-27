"use client";

import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { Screen } from "@/components/dashboard/ios";
import { UptimeView } from "@/components/dashboard/uptime-view";

export default function SiteUptimePage() {
  const { workspaceId, siteId } = useParams();
  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen title="Uptime" subtitle="Checks for this site">
        <UptimeView siteId={siteId} canRun />
      </Screen>
    </DashboardShell>
  );
}

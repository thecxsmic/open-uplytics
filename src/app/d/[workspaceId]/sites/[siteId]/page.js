"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink, Settings } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { useCopyTag } from "@/components/dashboard/copy-tag";
import { Bone, Group, HeaderButton, Segmented, Screen } from "@/components/dashboard/ios";
import { useCachedGet } from "@/lib/use-cached-get";
import { UptimeView } from "@/components/dashboard/uptime-view";

export default function SiteDashboard() {
  const { workspaceId, siteId } = useParams();
  const { data: site } = useCachedGet(siteId ? `/api/sites/${siteId}` : null);
  const [tab, setTab] = useState("analytics");

  const canWrite = site?.role && site.role !== "viewer";
  const { copied, copy } = useCopyTag(site?.snippet);

  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen
        wide
        title={site ? site.site?.name || "Site" : <Bone className="h-9 w-40" />}
        subtitle={site ? site.site?.domain : <Bone className="h-4 w-28" />}
        action={
          <span className="flex items-center gap-2">
            {site?.site?.status_slug ? (
              <Link
                href={`/status/${site.site.status_slug}`}
                target="_blank"
                aria-label="Status"
                className="ios-press inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-[15px] font-semibold text-white"
              >
                <ExternalLink className="size-[18px] shrink-0" aria-hidden />
                <span className="max-sm:sr-only">Status</span>
              </Link>
            ) : null}
            {site?.snippet ? (
              <HeaderButton type="button" icon={Copy} variant="ghost" onClick={copy}>
                {copied ? "Copied" : "Copy tag"}
              </HeaderButton>
            ) : null}
            <HeaderButton
              href={`/d/${workspaceId}/sites/${siteId}/settings`}
              icon={Settings}
              variant="ghost"
            >
              Settings
            </HeaderButton>
          </span>
        }
      >
        {!site?.site?.verified && site ? (
          <Group
            className="mb-4"
            footer="Open the site after the tag is in place. That first visit verifies it, and uptime checks start then."
          >
            <p className="px-4 py-3 text-[15px] leading-5 text-amber-200">
              Waiting for the first visit. Copy the tag and paste it before {"</head>"}.
            </p>
            <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-5 text-zinc-300">
              {site.snippet}
            </pre>
            <button
              type="button"
              onClick={copy}
              className="ios-row flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left text-[16px] text-white"
            >
              <span>Copy tag</span>
              <span className="text-[15px] text-zinc-500">{copied ? "Copied" : "Copy"}</span>
            </button>
          </Group>
        ) : null}
        <div className="mb-4">
          <Segmented
            id="site"
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
          <AnalyticsView siteId={siteId} />
        ) : (
          <UptimeView siteId={siteId} canRun={canWrite} />
        )}
      </Screen>
    </DashboardShell>
  );
}

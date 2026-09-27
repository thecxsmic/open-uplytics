"use client";

import { useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { DemoBanner } from "@/components/dashboard/demo-banner";
import { Group, Row, RowsSkeleton, Screen } from "@/components/dashboard/ios";
import { cachedGet } from "@/lib/get-cache";
import { useCachedGet } from "@/lib/use-cached-get";


export default function DemoWorkspacePage() {
  const { data, error } = useCachedGet("/api/demo");

  useEffect(() => {
    (data?.sites || []).slice(0, 8).forEach((site) => {
      cachedGet(`/api/demo/sites/${site.id}`).catch(() => {});
      cachedGet(`/api/demo/sites/${site.id}/analytics?range=7d`).catch(() => {});
      cachedGet(`/api/demo/sites/${site.id}/uptime`).catch(() => {});
    });
  }, [data]);

  return (
    <DashboardShell demo>
      <Screen
        title={data?.workspace?.name || "Sites"}
        subtitle={
          data
            ? "Sample traffic and uptime. Nothing here can be changed."
            : "A sample workspace"
        }
      >
        <DemoBanner />
        {error ? (
          <Group>
            <div className="px-4 py-4 text-[15px] text-zinc-400">
              <p className="text-white">{error}</p>
              <p className="mt-2">
                Seed it with <code className="text-zinc-200">npm run db:demo</code> after filling{" "}
                <code className="text-zinc-200">.env</code>.
              </p>
              <Link href="/sign-up" className="ios-press mt-3 inline-flex min-h-11 items-center font-semibold text-white">
                Start free instead
              </Link>
            </div>
          </Group>
        ) : (
          <Group busy={!data}>
            {!data ? (
              <RowsSkeleton count={2} />
            ) : data.sites?.length ? (
              data.sites.map((site) => (
                <Row
                  key={site.id}
                  href={`/demo/sites/${site.id}`}
                  title={site.name}
                  subtitle={site.domain}
                  trailing={site.verified ? "Verified" : "Waiting"}
                />
              ))
            ) : (
              <p className="px-4 py-4 text-[15px] text-zinc-500">No sites in this demo.</p>
            )}
          </Group>
        )}
      </Screen>
    </DashboardShell>
  );
}

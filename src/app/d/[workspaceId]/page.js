"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Bone, Group, HeaderButton, Row, RowsSkeleton, Screen } from "@/components/dashboard/ios";
import { cachedGet } from "@/lib/get-cache";
import { useCachedGet } from "@/lib/use-cached-get";

export default function WorkspaceHome() {
  const { workspaceId } = useParams();
  const { data } = useCachedGet(workspaceId ? `/api/workspaces/${workspaceId}` : null);

  useEffect(() => {
    (data?.sites || []).slice(0, 8).forEach((site) => {
      cachedGet(`/api/sites/${site.id}`).catch(() => {});
      cachedGet(`/api/sites/${site.id}/analytics?range=7d`).catch(() => {});
    });
  }, [data]);

  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen
        title={data ? data.workspace?.name || "Sites" : <Bone className="h-9 w-44" />}
        subtitle="Sites in this workspace"
        action={
          <HeaderButton href={`/d/${workspaceId}/sites/new`} icon={Plus}>
            Add
          </HeaderButton>
        }
      >
        <Group busy={!data}>
          {!data ? (
            <RowsSkeleton count={3} />
          ) : data.sites?.length ? (
            data.sites.map((site) => (
              <Row
                key={site.id}
                href={`/d/${workspaceId}/sites/${site.id}`}
                title={site.name}
                subtitle={site.domain}
                trailing={site.verified ? "Verified" : "Waiting"}
              />
            ))
          ) : (
            <p className="px-4 py-4 text-[15px] text-zinc-500">
              No sites yet. Add one to get a tracking snippet.
            </p>
          )}
        </Group>
      </Screen>
    </DashboardShell>
  );
}

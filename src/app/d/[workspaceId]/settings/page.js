"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { ActionSheet, Field, Group, PrimaryButton, Row, RowsSkeleton, Screen } from "@/components/dashboard/ios";
import { invalidateGet } from "@/lib/get-cache";
import { useCachedGet } from "@/lib/use-cached-get";
import { toast } from "sonner";

export default function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const { data } = useCachedGet(workspaceId ? `/api/workspaces/${workspaceId}` : null);
  const { data: activityData } = useCachedGet(
    workspaceId ? `/api/workspaces/${workspaceId}/activity` : null,
  );
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seeded = useRef("");
  const nameReady = Boolean(data);
  const activityReady = activityData !== undefined;
  const activity = activityData?.activity || [];

  useEffect(() => {
    if (!data || seeded.current === workspaceId) return;
    seeded.current = workspaceId;
    setName(data.workspace?.name || "");
  }, [data, workspaceId]);

  async function save(e) {
    e.preventDefault();
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      invalidateGet(`/api/workspaces/${workspaceId}`);
      invalidateGet("/api/workspaces");
      toast.success("Saved");
    } else toast.error("Could not save");
  }

  async function destroy() {
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
    if (res.ok) {
      invalidateGet("/api/workspaces");
      router.push("/d");
    }
    else toast.error("Only the owner can delete this workspace");
    setConfirmDelete(false);
  }

  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen title="Settings" subtitle="Name, history, and deletion.">
        <form onSubmit={save}>
          <Group title="Workspace" busy={!nameReady}>
            {nameReady ? (
              <Field id="name" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <RowsSkeleton count={1} />
            )}
          </Group>
          <PrimaryButton type="submit" disabled={!nameReady} className="-mt-3 mb-7">
            Save
          </PrimaryButton>
        </form>
        <Group title="Activity" busy={!activityReady}>
          {!activityReady ? (
            <RowsSkeleton count={4} />
          ) : activity.length ? (
            activity.map((item) => (
              <Row
                key={item.id}
                title={item.action}
                subtitle={`${new Date(item.created_at).toLocaleString()} · ${item.email || "system"}`}
              />
            ))
          ) : (
            <p className="px-4 py-4 text-[15px] text-zinc-500">No activity yet.</p>
          )}
        </Group>
        <Group>
          <Row title="Delete workspace" destructive chevron onClick={() => setConfirmDelete(true)} />
        </Group>
      </Screen>
      <ActionSheet
        open={confirmDelete}
        title="Delete this workspace and all of its sites?"
        onClose={() => setConfirmDelete(false)}
        actions={[{ label: "Delete workspace", destructive: true, onClick: destroy }]}
      />
    </DashboardShell>
  );
}

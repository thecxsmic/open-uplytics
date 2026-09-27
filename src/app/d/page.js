"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Field, Group, PrimaryButton, Row, RowsSkeleton, Screen } from "@/components/dashboard/ios";
import { useCachedGet } from "@/lib/use-cached-get";


export default function WorkspacesPage() {
  const { data, ready, reload } = useCachedGet("/api/workspaces");
  const workspaces = data?.workspaces || [];
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    setName("");
    reload();
  }

  return (
    <DashboardShell>
      <Screen title="Websites" subtitle="Add as many as you want. Each one can hold any number of sites.">
        <form onSubmit={create}>
          <Group title="New website" footer={error || "Give it a short name, like your company."}>
            <Field
              label="Name"
              id="ws"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme"
              required
            />
          </Group>
          <PrimaryButton type="submit" icon={Plus} busy={busy} className="-mt-3 mb-7">
            Create
          </PrimaryButton>
        </form>
        <Group title="Your workspaces" busy={!ready}>
          {!ready ? (
            <RowsSkeleton count={3} />
          ) : workspaces.length ? (
            workspaces.map((workspace) => (
              <Row
                key={workspace.id}
                href={`/d/${workspace.id}`}
                title={workspace.name}
                subtitle={
                  Number(workspace.site_count) === 1
                    ? "1 site"
                    : `${Number(workspace.site_count) || 0} sites`
                }
              />
            ))
          ) : (
            <p className="px-4 py-4 text-[15px] text-zinc-500">No websites yet.</p>
          )}
        </Group>
      </Screen>
    </DashboardShell>
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";
import { Field, Group, PrimaryButton, Screen } from "@/components/dashboard/ios";
import { invalidateGet } from "@/lib/get-cache";

function addBlank(list) {
  return [...list, ""];
}

export default function NewSitePage() {
  const { workspaceId } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    domain: "",
    health: [""],
    emails: [""],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        name: form.name,
        domain: form.domain,
        healthUrls: form.health,
        notificationEmails: form.emails,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Failed");
      return;
    }
    invalidateGet(`/api/workspaces/${workspaceId}`);
    invalidateGet("/api/workspaces");
    router.push(`/d/${workspaceId}/sites/${json.site.id}/settings`);
  }

  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen title="New site" subtitle="Add the domain you want to measure.">
        <form onSubmit={onSubmit}>
          <Group title="Site">
            <Field label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Field
              label="Domain"
              placeholder="example.com"
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              required
            />
          </Group>
          <Group title="Pages to check" footer="Add every URL you want checked. Leave them blank if you only want stats.">
            {form.health.map((url, index) => (
              <Field
                key={index}
                label={form.health.length === 1 ? "URL" : `URL ${index + 1}`}
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  const health = [...form.health];
                  health[index] = e.target.value;
                  setForm((current) => ({ ...current, health }));
                }}
              />
            ))}
            <button
              type="button"
              className="min-h-11 px-4 text-left text-[15px] text-zinc-300"
              onClick={() => setForm((current) => ({ ...current, health: addBlank(current.health) }))}
            >
              Add another URL
            </button>
          </Group>
          <Group title="Alert emails" footer="Mail goes out when a page goes down or comes back. Add as many addresses as you want.">
            {form.emails.map((email, index) => (
              <Field
                key={index}
                label={form.emails.length === 1 ? "Email" : `Email ${index + 1}`}
                type="email"
                value={email}
                onChange={(e) => {
                  const emails = [...form.emails];
                  emails[index] = e.target.value;
                  setForm((current) => ({ ...current, emails }));
                }}
              />
            ))}
            <button
              type="button"
              className="min-h-11 px-4 text-left text-[15px] text-zinc-300"
              onClick={() => setForm((current) => ({ ...current, emails: addBlank(current.emails) }))}
            >
              Add another email
            </button>
          </Group>
          {error ? <p className="-mt-3 mb-3 px-4 text-[13px] text-red-400">{error}</p> : null}
          <PrimaryButton type="submit" icon={Plus} busy={busy} className="-mt-2">
            Create site
          </PrimaryButton>
        </form>
      </Screen>
    </DashboardShell>
  );
}

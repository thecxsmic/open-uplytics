"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import {
  ActionSheet,
  Bone,
  Field,
  Group,
  PrimaryButton,
  Row,
  RowsSkeleton,
  Screen,
  SwitchRow,
} from "@/components/dashboard/ios";
import { CopyTagRow } from "@/components/dashboard/copy-tag";
import { invalidateGet } from "@/lib/get-cache";
import { useCachedGet } from "@/lib/use-cached-get";
import { toast } from "sonner";

function filledOrBlank(values) {
  const list = (values || []).filter((value) => String(value || "").trim());
  return list.length ? list : [""];
}

export default function SiteSettingsPage() {
  const { workspaceId, siteId } = useParams();
  const router = useRouter();
  const { data, reload } = useCachedGet(siteId ? `/api/sites/${siteId}` : null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const seeded = useRef("");

  useEffect(() => {
    if (!data?.site || seeded.current === siteId) return;
    seeded.current = siteId;
    setForm({
      name: data.site?.name || "",
      domain: data.site?.domain || "",
      allowedDomains: (typeof data.site?.allowed_domains === "string"
        ? JSON.parse(data.site.allowed_domains)
        : data.site?.allowed_domains || []
      ).join(", "),
      healthUrls: filledOrBlank(data.healthUrls),
      notificationEmails: filledOrBlank(data.notificationEmails),
      bypassOrigin: Boolean(data.site?.bypass_origin),
    });
  }, [data, siteId]);

  const readOnly = data?.role === "viewer";

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/sites/${siteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        domain: form.domain,
        allowedDomains: form.allowedDomains.split(",").map((s) => s.trim()).filter(Boolean),
        healthUrls: form.healthUrls,
        notificationEmails: form.notificationEmails,
        bypassOrigin: form.bypassOrigin,
      }),
    });
    setBusy(false);
    if (res.ok) {
      invalidateGet(`/api/workspaces/${workspaceId}`);
      await reload();
      toast.success("Saved");
    } else toast.error("Could not save");
  }

  async function remove() {
    const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    setConfirmDelete(false);
    if (res.ok) {
      invalidateGet(`/api/sites/${siteId}`);
      invalidateGet(`/api/workspaces/${workspaceId}`);
      router.push(`/d/${workspaceId}`);
    }
  }

  if (!form) {
    return (
      <DashboardShell workspaceId={workspaceId}>
        <Screen title="Settings" subtitle={<Bone className="h-4 w-32" />}>
          <Group title="Install" busy>
            <div className="space-y-2 px-4 py-4">
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-11/12" />
              <Bone className="h-3 w-2/3" />
            </div>
          </Group>
          <Group title="Site" busy>
            <RowsSkeleton count={3} />
          </Group>
          <Group title="Pages to check" busy>
            <RowsSkeleton count={3} />
          </Group>
        </Screen>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell workspaceId={workspaceId}>
      <Screen title="Settings" subtitle={form.domain || "Site"}>
        <Group
          title="Install"
          footer="Paste this before </head>. The site is verified when the first visit arrives. No meta tag or DNS record."
        >
          <pre className="overflow-x-auto px-4 py-3 text-[12px] leading-5 text-zinc-300">
            {data.snippet}
          </pre>
          <CopyTagRow code={data.snippet} />
        </Group>
        <form onSubmit={save}>
          <Group title="Site">
            <Field
              label="Name"
              value={form.name}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Field
              label="Domain"
              value={form.domain}
              disabled={readOnly}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
            />
            <Field
              label="Other allowed domains"
              value={form.allowedDomains}
              disabled={readOnly}
              placeholder="www.example.com, app.example.com"
              onChange={(e) => setForm({ ...form, allowedDomains: e.target.value })}
            />
            <SwitchRow
              label="Bypass origin check"
              detail="For local development only."
              checked={form.bypassOrigin}
              disabled={readOnly}
              onChange={(value) => setForm({ ...form, bypassOrigin: value })}
            />
          </Group>
          <Group title="Pages to check" footer="Add every URL you want checked. Leave them blank if you only want stats.">
            {form.healthUrls.map((url, index) => (
              <Field
                key={index}
                label={`URL ${index + 1}`}
                value={url}
                disabled={readOnly}
                onChange={(e) => {
                  const next = [...form.healthUrls];
                  next[index] = e.target.value;
                  setForm({ ...form, healthUrls: next });
                }}
              />
            ))}
            {readOnly ? null : (
              <button
                type="button"
                className="min-h-11 px-4 text-left text-[15px] text-zinc-300"
                onClick={() => setForm({ ...form, healthUrls: [...form.healthUrls, ""] })}
              >
                Add another URL
              </button>
            )}
          </Group>
          <Group title="Alert emails" footer="Mail goes out when a page goes down or comes back.">
            {form.notificationEmails.map((email, index) => (
              <Field
                key={index}
                label={`Email ${index + 1}`}
                type="email"
                value={email}
                disabled={readOnly}
                onChange={(e) => {
                  const next = [...form.notificationEmails];
                  next[index] = e.target.value;
                  setForm({ ...form, notificationEmails: next });
                }}
              />
            ))}
            {readOnly ? null : (
              <button
                type="button"
                className="min-h-11 px-4 text-left text-[15px] text-zinc-300"
                onClick={() =>
                  setForm({ ...form, notificationEmails: [...form.notificationEmails, ""] })
                }
              >
                Add another email
              </button>
            )}
          </Group>
          {readOnly ? null : (
            <PrimaryButton busy={busy} className="-mt-2 mb-7">
              Save
            </PrimaryButton>
          )}
        </form>
        {readOnly ? null : (
          <Group>
            <Row title="Delete site" destructive chevron onClick={() => setConfirmDelete(true)} />
          </Group>
        )}
      </Screen>
      <ActionSheet
        open={confirmDelete}
        title="Delete this site and its stats?"
        onClose={() => setConfirmDelete(false)}
        actions={[{ label: "Delete site", destructive: true, onClick: remove }]}
      />
    </DashboardShell>
  );
}

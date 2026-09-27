"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AuthenticatorSetup } from "@/components/auth/authenticator-setup";
import { Bone, Field, Group, PrimaryButton, Row, RowsSkeleton } from "@/components/dashboard/ios";
import { clearGetCache, putGet } from "@/lib/get-cache";
import { useCachedGet } from "@/lib/use-cached-get";

function initialOf(account) {
  return String(account?.name || account?.email || "U").trim().slice(0, 1).toUpperCase();
}

export function AccountForm({ showBack = false, titleId = "account-dialog-title" }) {
  const router = useRouter();
  const { data, status, reload } = useCachedGet("/api/account");
  const account = data || null;
  const [view, setView] = useState("home");
  const [name, setName] = useState("");
  const [seededFor, setSeededFor] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState("");

  if (account?.id && seededFor !== account.id) {
    setSeededFor(account.id);
    setName(account.name || "");
  }

  useEffect(() => {
    if (status === 401) router.replace("/sign-in?next=/account");
  }, [status, router]);

  useEffect(() => {
    document.getElementById("account-sheet-body")?.scrollTo(0, 0);
  }, [view]);

  function openView(next) {
    setError("");
    setView(next);
  }

  function goHome(message) {
    setError("");
    setView("home");
    if (message) setNote(message);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setNote("");
    setPending("save");
    const body =
      view === "password"
        ? {
            newPassword,
            currentPassword: account?.passwordSet ? currentPassword : undefined,
          }
        : { name };
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not save.");
      setPending("");
      return;
    }
    setName(json.name || "");
    putGet("/api/account", json);
    setCurrentPassword("");
    setNewPassword("");
    setPending("");
    goHome(view === "password" ? "Password saved." : "Name saved.");
  }

  async function disable(event) {
    event.preventDefault();
    setError("");
    setNote("");
    setPending("disable");
    const res = await fetch("/api/auth/totp/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword, code: disableCode }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not turn it off.");
      setPending("");
      return;
    }
    setDisablePassword("");
    setDisableCode("");
    setPending("");
    reload();
    goHome("Authenticator is off. Add it again before you need to recover the account.");
  }

  async function signOut(everywhere) {
    clearGetCache();
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ everywhere }),
    });
    router.push("/sign-in");
    router.refresh();
  }

  if (!account) {
    return (
      <>
        <h2 id={titleId} className="sr-only">
          Account
        </h2>
        <div className="mb-6 flex flex-col items-center pt-1">
          <Bone className="size-[72px] rounded-full" />
          <Bone className="mt-4 h-5 w-32" />
          <Bone className="mt-2 h-4 w-44" />
        </div>
        <Group busy>
          <RowsSkeleton count={3} />
        </Group>
      </>
    );
  }

  if (view !== "home") {
    const title =
      view === "name" ? "Name" : view === "password" ? "Password" : "Authenticator";
    return (
      <>
        <button
          type="button"
          onClick={() => openView("home")}
          className="ios-press mb-3 inline-flex min-h-11 items-center gap-0.5 text-[15px] text-zinc-400"
        >
          <ChevronLeft className="size-5" aria-hidden />
          Account
        </button>
        <h2 id={titleId} className="mb-5 text-[28px] font-bold tracking-tight text-white">
          {title}
        </h2>
        {view === "name" ? (
          <form onSubmit={saveProfile}>
            <Group footer="This is the name shown next to your account.">
              <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            </Group>
            {error ? <p className="-mt-4 mb-3 px-4 text-[13px] text-red-400">{error}</p> : null}
            <PrimaryButton type="submit" busy={pending === "save"} className="-mt-3">
              Save
            </PrimaryButton>
          </form>
        ) : null}
        {view === "password" ? (
          <form onSubmit={saveProfile}>
            <Group
              footer={
                account.passwordSet
                  ? "At least 10 characters. Your current password is required."
                  : "At least 10 characters. You can then sign in with email as well as Google."
              }
            >
              {account.passwordSet ? (
                <Field
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              ) : null}
              <Field
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Group>
            {error ? <p className="-mt-4 mb-3 px-4 text-[13px] text-red-400">{error}</p> : null}
            <PrimaryButton type="submit" busy={pending === "save"} className="-mt-3">
              Save
            </PrimaryButton>
          </form>
        ) : null}
        {view === "authenticator" ? (
          <Group footer="Use this to set a new password without email. Email is only the last resort.">
            {account.totpEnabled ? (
              <form onSubmit={disable} className="px-4 py-3">
                <p className="mb-3 text-sm text-zinc-300">Authenticator is on.</p>
                <Field
                  label="Password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                />
                <Field
                  label="Authenticator or backup code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  required
                />
                {error ? <p className="mt-2 text-[13px] text-red-400">{error}</p> : null}
                <PrimaryButton type="submit" busy={pending === "disable"} className="mt-3">
                  Turn off
                </PrimaryButton>
              </form>
            ) : adding ? (
              <div className="px-4 py-4">
                <AuthenticatorSetup
                  onDone={() => {
                    setAdding(false);
                    reload();
                    goHome("Authenticator is on. Keep the backup codes.");
                  }}
                />
              </div>
            ) : (
              <div className="px-4 py-4">
                <p className="text-sm text-zinc-400">
                  Not set up yet. Add an app such as Google Authenticator, 1Password, or Aegis.
                </p>
                <PrimaryButton type="button" className="mt-3" onClick={() => setAdding(true)}>
                  Add authenticator
                </PrimaryButton>
              </div>
            )}
          </Group>
        ) : null}
      </>
    );
  }

  return (
    <>
      <h2 id={titleId} className="sr-only">
        Account
      </h2>
      {showBack ? (
        <p className="mb-4 text-sm text-zinc-500">
          <Link href="/d" className="text-zinc-300 hover:underline">
            Back to websites
          </Link>
        </p>
      ) : null}
      <div className="mb-6 flex flex-col items-center pt-1 text-center">
        <span className="inline-flex size-[72px] items-center justify-center rounded-full bg-white text-[28px] font-semibold text-black">
          {initialOf(account)}
        </span>
        <p className="mt-3 max-w-full truncate text-[20px] font-semibold text-white">
          {account.name || "Account"}
        </p>
        <p className="mt-0.5 max-w-full truncate text-[15px] text-zinc-500">{account.email}</p>
        {note ? <p className="mt-3 max-w-sm text-[13px] leading-5 text-emerald-400">{note}</p> : null}
      </div>
      <Group>
        <Row title="Name" trailing={account.name || "Add"} chevron onClick={() => openView("name")} />
        <Row
          title="Password"
          trailing={account.passwordSet ? "Change" : "Add"}
          chevron
          onClick={() => openView("password")}
        />
        <Row
          title="Authenticator"
          trailing={account.totpEnabled ? "On" : "Off"}
          chevron
          onClick={() => openView("authenticator")}
        />
      </Group>
      <Group>
        <Row title="Sign out" onClick={() => signOut(false)} />
        <Row title="Sign out of every device" destructive onClick={() => signOut(true)} />
      </Group>
    </>
  );
}

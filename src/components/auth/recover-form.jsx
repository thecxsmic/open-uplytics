"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthButton, AuthError, AuthField, AuthScreen } from "@/components/auth/screen";
import { Spinner } from "@/components/spinner";

export function RecoverForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mailing, setMailing] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    const res = await fetch("/api/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not reset the password.");
      return;
    }
    router.push("/d");
    router.refresh();
  }

  async function sendEmail() {
    setMailing(true);
    setError("");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({}));
    setMailing(false);
    if (!res.ok) {
      setError(json.error || "Could not send email.");
      return;
    }
    setNote(json.message || "Check your inbox.");
  }

  return (
    <AuthScreen
      title="Get back in"
      subtitle="Use a code from your authenticator app, or a backup code. That sets a new password without email."
      footer={
        <Link href="/sign-in" className="text-zinc-300 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <AuthField
          label="Authenticator or backup code"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
        <AuthField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={10}
          required
        />
        <AuthError>{error}</AuthError>
        {note ? <p className="text-sm leading-relaxed text-zinc-300">{note}</p> : null}
        <AuthButton type="submit" busy={busy}>
          Set a new password
        </AuthButton>
      </form>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs leading-relaxed text-zinc-500">
          Last resort, if the app and the backup codes are gone: we email a link. That link turns the authenticator off.
        </p>
        <button
          type="button"
          onClick={sendEmail}
          disabled={mailing || !email}
          className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
        >
          {mailing ? <Spinner className="size-4" /> : null}
          Email me a reset link
        </button>
      </div>
    </AuthScreen>
  );
}

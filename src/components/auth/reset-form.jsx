"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthButton, AuthError, AuthField, AuthScreen } from "@/components/auth/screen";

export function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not reset the password.");
      return;
    }
    router.push("/account");
    router.refresh();
  }

  return (
    <AuthScreen
      title="Set a new password"
      subtitle="This link is the last resort. Saving a password here turns the authenticator off. Add it again from Account."
    >
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={10}
          required
        />
        <AuthError>{error || (token ? "" : "This reset link is missing a token.")}</AuthError>
        <AuthButton type="submit" busy={busy} disabled={!token}>
          Save password
        </AuthButton>
      </form>
    </AuthScreen>
  );
}

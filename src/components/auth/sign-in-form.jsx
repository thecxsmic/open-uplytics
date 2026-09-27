"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthButton, AuthError, AuthField, AuthScreen } from "@/components/auth/screen";
import { AuthDivider, GoogleButton, googleErrorMessage } from "@/components/auth/google-button";
import { safeNextPath } from "@/lib/auth-cookie";
import { clearGetCache } from "@/lib/get-cache";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next") || params.get("redirect_url"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState(googleErrorMessage(params.get("error")));
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, code: needsCode ? code : "" }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.totp) {
      setNeedsCode(true);
      return;
    }
    if (!res.ok) {
      setError(json.error || "Could not sign in.");
      return;
    }
    clearGetCache();
    router.push(next);
    router.refresh();
  }

  return (
    <AuthScreen
      title={needsCode ? "Authenticator code" : "Sign in"}
      subtitle={
        needsCode
          ? "Enter the 6-digit code from your authenticator app. A backup code works too."
          : "Google is the fastest way in. Email still works if you set a password."
      }
      footer={
        needsCode ? null : (
          <>
            No account?{" "}
            <Link href="/sign-up" className="text-zinc-200 hover:underline">
              Start free
            </Link>
          </>
        )
      }
    >
      {needsCode ? null : (
        <div className="mb-4 space-y-4">
          <GoogleButton next={next} />
          <AuthDivider />
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        {needsCode ? null : (
          <>
            <AuthField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <AuthField
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </>
        )}
        {needsCode ? (
          <AuthField
            label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        ) : null}
        <AuthError>{error}</AuthError>
        <AuthButton type="submit" tone={needsCode ? "primary" : "quiet"} busy={busy}>
          {needsCode ? "Continue" : "Sign in with email"}
        </AuthButton>
        {needsCode ? (
          <button
            type="button"
            className="w-full text-sm text-zinc-500 hover:text-zinc-300"
            onClick={() => {
              setNeedsCode(false);
              setCode("");
              setError("");
            }}
          >
            Use a different account
          </button>
        ) : (
          <p className="text-center text-sm text-zinc-500">
            <Link href={`/sign-in/recover?email=${encodeURIComponent(email)}`} className="hover:text-zinc-300">
              Forgot password? Use your authenticator
            </Link>
          </p>
        )}
      </form>
    </AuthScreen>
  );
}

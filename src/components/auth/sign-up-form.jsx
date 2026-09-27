"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthButton, AuthError, AuthField, AuthScreen } from "@/components/auth/screen";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { AuthenticatorSetup } from "@/components/auth/authenticator-setup";
import { clearGetCache } from "@/lib/get-cache";

export function SignUpForm() {
  const router = useRouter();
  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not create the account.");
      return;
    }
    clearGetCache();
    setStep("authenticator");
  }

  if (step === "authenticator") {
    return (
      <AuthScreen
        title="Add an authenticator"
        subtitle="This is how you get the account back if you forget the password. Email reset stays as a last resort."
      >
        <AuthenticatorSetup
          onDone={() => {
            router.push("/d");
            router.refresh();
          }}
          onSkip={() => {
            router.push("/d");
            router.refresh();
          }}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="Continue with Google, or use email. Websites and uptime checks are unlimited."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="text-zinc-200 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-4 space-y-4">
        <GoogleButton />
        <AuthDivider />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <AuthField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
        />
        <p className="text-xs leading-relaxed text-zinc-500">At least 10 characters. Next you’ll add an authenticator app.</p>
        <AuthError>{error}</AuthError>
        <AuthButton type="submit" tone="quiet" busy={busy}>
          Continue with email
        </AuthButton>
      </form>
    </AuthScreen>
  );
}

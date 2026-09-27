"use client";

import { useEffect, useState } from "react";
import { AuthButton, AuthError, AuthField } from "@/components/auth/screen";

export function AuthenticatorSetup({ onDone, onSkip }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/totp/start", { method: "POST" })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) setError(json.error || "Could not start authenticator setup.");
        else setSetup(json);
      })
      .catch(() => {
        if (!cancelled) setError("Could not start authenticator setup.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/totp/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "That code did not match.");
      return;
    }
    setCodes(json.codes || []);
  }

  if (codes) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          Save these backup codes somewhere offline. Each one works once if you lose the app. Email reset is only for when these are gone too.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-black p-3 font-mono text-sm text-white">
          {codes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <AuthButton type="button" onClick={onDone}>
          Continue
        </AuthButton>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="space-y-4">
      {setup?.svg ? (
        <div
          className="mx-auto w-fit rounded-md bg-black p-3 [&_svg]:h-44 [&_svg]:w-44"
          dangerouslySetInnerHTML={{ __html: setup.svg }}
        />
      ) : (
        <p className="text-sm text-zinc-500">{error ? "" : "Preparing a code…"}</p>
      )}
      {setup?.secret ? (
        <p className="break-all text-center font-mono text-xs text-zinc-400">
          Or enter this key: {setup.secret}
        </p>
      ) : null}
      <AuthField
        label="Code from the app"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        required
      />
      <AuthError>{error}</AuthError>
      <AuthButton type="submit" busy={busy} disabled={!setup}>
        Turn on authenticator
      </AuthButton>
      {onSkip ? (
        <button type="button" onClick={onSkip} className="w-full text-sm text-zinc-500 hover:text-zinc-300">
          Skip for now
        </button>
      ) : null}
    </form>
  );
}

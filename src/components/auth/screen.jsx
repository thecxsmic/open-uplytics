import Link from "next/link";
import { Logo } from "@/components/logo";
import { Spinner } from "@/components/spinner";

export function AuthScreen({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-[400px] rounded-xl border border-white/10 bg-zinc-950 px-7 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <Logo />
        <h1 className="mt-7 text-[1.45rem] font-semibold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-6 w-full max-w-[400px] text-center text-sm text-zinc-500">{footer}</div> : null}
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-zinc-600">
        By continuing you agree to the{" "}
        <Link href="/terms" className="text-zinc-400 underline-offset-4 hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-zinc-400 underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <Link href="/" className="mt-3 min-h-11 text-sm text-zinc-500 hover:text-zinc-200">
        Back to home
      </Link>
    </div>
  );
}

export function AuthField({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
      />
    </label>
  );
}

export function AuthButton({ children, tone = "primary", busy = false, disabled, ...props }) {
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={
        tone === "quiet"
          ? "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-transparent text-sm font-semibold text-white disabled:opacity-50"
          : "inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-black disabled:opacity-50"
      }
    >
      {busy ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return <p className="text-sm text-red-400">{children}</p>;
}

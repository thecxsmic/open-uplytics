import { logoDots } from "@/lib/logo-mark";
import { cn } from "@/lib/utils";

function LogoMark({ className }) {
  const dots = logoDots();

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("block size-6 shrink-0 overflow-visible", className)}
      aria-hidden
    >
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill="currentColor" />
      ))}
    </svg>
  );
}

export function Logo({ className, wordmark = "Uplitycs", wordmarkClassName }) {
  const mark = String(wordmark || "Uplitycs").trim() || "Uplitycs";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 font-semibold leading-none tracking-tight",
        className,
      )}
    >
      <LogoMark />
      <span className={cn("leading-none", wordmarkClassName)}>{mark}</span>
    </span>
  );
}

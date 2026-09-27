import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "border-zinc-800 bg-zinc-900 text-zinc-200",
        variant === "success" && "border-emerald-900 bg-emerald-950 text-emerald-400",
        variant === "danger" && "border-red-900 bg-red-950 text-red-400",
        variant === "outline" && "border-zinc-700 text-zinc-300",
        className,
      )}
      {...props}
    />
  );
}

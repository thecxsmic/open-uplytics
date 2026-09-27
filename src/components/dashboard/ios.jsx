"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

export function Screen({ title, subtitle, action, wide, children }) {
  return (
    <div className={cn("w-full", wide ? "max-w-6xl" : "max-w-3xl")}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-white">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-[15px] leading-5 text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pb-0.5">{action}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Bone({ className }) {
  return <span className={cn("skeleton block rounded-md", className)} aria-hidden />;
}

export function RowSkeleton() {
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <Bone className="h-4 w-2/5 max-w-48" />
        <Bone className="mt-2 h-3 w-1/4 max-w-28" />
      </span>
      <Bone className="h-3 w-14 shrink-0" />
    </div>
  );
}

export function RowsSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, index) => <RowSkeleton key={index} />);
}

export function Group({ title, footer, children, className, busy = false }) {
  return (
    <section className={cn("mb-7 min-w-0", className)} aria-busy={busy || undefined}>
      {busy ? <span className="sr-only">Loading</span> : null}
      {title ? (
        <h2 className="mb-2 px-4 text-[13px] font-medium uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
      ) : null}
      <div className="divide-y divide-white/[0.08] overflow-hidden rounded-[14px] bg-[#1c1c1e]">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-4 text-[13px] leading-5 text-zinc-500">{footer}</p>
      ) : null}
    </section>
  );
}

export function Row({
  href,
  onClick,
  title,
  subtitle,
  trailing,
  chevron,
  destructive,
}) {
  const showChevron = chevron ?? Boolean(href);
  const className = cn(
    "ios-row flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left",
    destructive ? "text-red-400" : "text-white",
  );
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] leading-5">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[13px] leading-4 text-zinc-500">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing != null && trailing !== "" ? (
        <span className="max-w-[46%] shrink-0 truncate text-right text-[15px] text-zinc-500">
          {trailing}
        </span>
      ) : null}
      {showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}

export function Field({ label, ...props }) {
  return (
    <label className="block px-4 py-2.5">
      <span className="block text-[12px] leading-4 text-zinc-500">{label}</span>
      <input
        {...props}
        className="mt-0.5 w-full bg-transparent text-[16px] leading-6 text-white outline-none placeholder:text-zinc-600 disabled:opacity-50"
      />
    </label>
  );
}

export function SwitchRow({ label, detail, checked, onChange, disabled }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[16px] leading-5">{label}</div>
        {detail ? <div className="mt-0.5 text-[13px] text-zinc-500">{detail}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "ios-press relative h-[31px] w-[51px] shrink-0 rounded-full p-[2px] disabled:opacity-40",
          checked ? "bg-emerald-500" : "bg-zinc-600",
        )}
      >
        <span
          className={cn(
            "block h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200",
            checked && "translate-x-[20px]",
          )}
        />
      </button>
    </div>
  );
}

export function Segmented({ id, value, onChange, options, label = "Choose" }) {
  const reduce = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid rounded-[10px] bg-[#1c1c1e] p-[2px]"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "ios-press relative h-8 rounded-[8px] text-[13px] font-medium",
              on ? "text-white" : "text-zinc-400",
              on && reduce && "bg-[#636366]",
            )}
          >
            {on && !reduce ? (
              <motion.span
                layoutId={`${id}-pill`}
                className="absolute inset-0 rounded-[8px] bg-[#636366]"
                transition={{ type: "spring", bounce: 0.18, duration: 0.38 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HeaderButton({ href, icon: Icon, children, variant = "solid", ...props }) {
  const className = cn(
    "ios-press inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-[15px] font-semibold",
    variant === "solid"
      ? "bg-white text-black"
      : "border border-white/15 bg-white/5 text-white",
  );
  const inner = (
    <>
      {Icon ? <Icon className="size-[18px] shrink-0" aria-hidden /> : null}
      <span className="max-sm:sr-only">{children}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className} {...props}>
      {inner}
    </button>
  );
}

export function PrimaryButton({ className, icon: Icon, busy = false, disabled, children, ...props }) {
  return (
    <button
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(
        "ios-press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-[17px] font-semibold text-black disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {busy ? <Spinner /> : Icon ? <Icon className="size-[18px] shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ActionSheet({ open, title, actions, onClose }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.2 }}
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-black/55"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title || "Actions"}
            initial={reduce ? false : { y: 28 }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: 28 }}
            transition={{ type: "spring", bounce: 0, duration: 0.34 }}
            className="relative z-10 w-full max-w-md px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="overflow-hidden rounded-2xl bg-[#2c2c2e]/95 text-center backdrop-blur-xl">
              {title ? (
                <p className="border-b border-white/10 px-4 py-3 text-[13px] leading-5 text-zinc-400">
                  {title}
                </p>
              ) : null}
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "ios-press block min-h-[56px] w-full border-b border-white/10 px-4 text-[17px] last:border-b-0",
                    action.destructive ? "font-semibold text-red-400" : "text-white",
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ios-press mt-2 min-h-[56px] w-full rounded-2xl bg-[#2c2c2e]/95 text-[17px] font-semibold text-white backdrop-blur-xl"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

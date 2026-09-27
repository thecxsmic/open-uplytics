"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AccountForm } from "@/components/account/account-form";
import { cn } from "@/lib/utils";

function useLargeScreen() {
  const [large, setLarge] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setLarge(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return large;
}

export function AccountMark({ name, email, onClick, className, showEmail = false }) {
  const initial = String(name || email || "U").trim().slice(0, 1).toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label="Account"
      className="ios-press flex min-w-0 items-center gap-2 rounded-full"
    >
      {showEmail ? (
        <span className="max-w-40 truncate text-[13px] text-zinc-500">{email}</span>
      ) : null}
      <span
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-black",
          className,
        )}
      >
        {initial}
      </span>
    </button>
  );
}

export function AccountSheet({ open, onClose }) {
  const reduce = useReducedMotion();
  const large = useLargeScreen();
  const titleId = useId();
  const closeRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
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
          className="fixed inset-0 z-[80] flex items-end justify-center lg:items-center lg:p-6"
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
            aria-labelledby={titleId}
            initial={reduce ? false : large ? { opacity: 0, y: 12, scale: 0.98 } : { y: "100%" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : large ? { opacity: 0, y: 8, scale: 0.98 } : { y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: reduce ? 0.01 : 0.36 }}
            className="relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[22px] bg-black shadow-2xl lg:max-h-[min(85dvh,760px)] lg:max-w-lg lg:rounded-[22px]"
          >
            <div className="shrink-0 px-3 pt-2 lg:pt-3">
              <div className="mx-auto mb-1 h-1 w-9 rounded-full bg-white/20 lg:hidden" aria-hidden />
              <div className="flex justify-end px-1">
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="ios-press inline-flex size-11 items-center justify-center rounded-full text-zinc-300 hover:bg-white/10"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div
              id="account-sheet-body"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              <AccountForm titleId={titleId} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

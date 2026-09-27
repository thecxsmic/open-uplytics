"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyBlock({ code, label = "Code" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 py-2">
        <span className="truncate text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${label}`}
          className="h-9 min-h-9 shrink-0 gap-1.5 text-xs text-zinc-300"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
        {code}
      </pre>
    </div>
  );
}

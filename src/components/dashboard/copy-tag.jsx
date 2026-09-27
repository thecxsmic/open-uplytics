"use client";

import { useState } from "react";
import { toast } from "sonner";

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export function useCopyTag(code) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    try {
      await writeClipboard(code);
      setCopied(true);
      toast.success("Tag copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the tag");
    }
  }

  return { copied, copy };
}

export function CopyTagRow({ code }) {
  const { copied, copy } = useCopyTag(code);

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!code}
      className="ios-row flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left text-[16px] text-white disabled:opacity-40"
    >
      <span>Copy tag</span>
      <span className="text-[15px] text-zinc-500">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

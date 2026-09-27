"use client";

import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-[14px] bg-[#1c1c1e] px-4 py-3">
      <p className="text-[13px] leading-5 text-zinc-400">
        Sample data. You can’t change anything here.
      </p>
      <Link href="/sign-up" className="ios-press shrink-0 text-[15px] font-semibold text-white">
        Create account
      </Link>
    </div>
  );
}

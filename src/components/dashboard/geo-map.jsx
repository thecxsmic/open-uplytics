"use client";

import { useMemo, useState } from "react";
import { WORLD, WORLD_NAMES, WORLD_VIEW } from "@/lib/world-map";
import { formatNumber } from "@/lib/utils";

function shade(count, max) {
  if (!count) return "rgba(255,255,255,0.07)";
  const t = Math.sqrt(count / Math.max(1, max));
  return `rgba(255,255,255,${(0.32 + 0.68 * t).toFixed(3)})`;
}

export function GeoMap({ rows }) {
  const counts = useMemo(() => {
    const map = new Map();
    for (const row of rows || []) {
      const id = String(row.name || "").trim().toLowerCase();
      if (/^[a-z]{2}$/.test(id)) map.set(id, (map.get(id) || 0) + (row.count || 0));
    }
    return map;
  }, [rows]);
  const ranked = useMemo(
    () => [...counts.entries()].sort((a, b) => b[1] - a[1]),
    [counts],
  );
  const max = ranked[0]?.[1] || 1;
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const focus = hover || pinned;
  const focusCount = focus ? counts.get(focus) || 0 : 0;
  const focusName = focus ? WORLD_NAMES[focus] || focus.toUpperCase() : "";
  const top = ranked.slice(0, 6);
  const barMax = top[0]?.[1] || 1;
  const summary = top.length
    ? `Locations. ${top
        .map(([id, count]) => `${WORLD_NAMES[id] || id.toUpperCase()} ${formatNumber(count)}`)
        .join(", ")}.`
    : "Locations. No country data in this range.";

  return (
    <>
      <div className="px-2 pt-3">
      <svg
        viewBox={WORLD_VIEW}
        className="block h-auto w-full"
        role="img"
        aria-label={summary}
      >
        {WORLD.map(([id, name, path]) => {
          const count = counts.get(id) || 0;
          const active = focus === id;
          return (
            <path
              key={id}
              d={path}
              fill={active ? "#fff" : shade(count, max)}
              stroke="#1c1c1e"
              strokeWidth="0.8"
              aria-hidden
              className="cursor-pointer"
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover((current) => (current === id ? null : current))}
              onClick={() => setPinned((current) => (current === id ? null : id))}
            >
              <title>
                {name}
                {count ? ` · ${formatNumber(count)}` : ""}
              </title>
            </path>
          );
        })}
      </svg>
      </div>
      <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-[15px]">
        <span className="min-w-0 truncate">
          {focusName || (top.length ? "All countries" : "No country data yet")}
        </span>
        <span className="shrink-0 tabular-nums text-zinc-400">
          {focus ? formatNumber(focusCount) : top.length ? formatNumber(ranked.reduce((sum, row) => sum + row[1], 0)) : ""}
        </span>
      </div>
      {top.map(([id, count]) => (
        <button
          key={id}
          type="button"
          className="ios-press relative min-h-[48px] w-full overflow-hidden px-4 py-3 text-left text-white"
          onClick={() => setPinned((current) => (current === id ? null : id))}
          onPointerEnter={() => setHover(id)}
          onPointerLeave={() => setHover((current) => (current === id ? null : current))}
          aria-pressed={pinned === id}
        >
          <span className="pointer-events-none absolute inset-y-1.5 right-2 left-2">
            <span
              className="block h-full max-w-full rounded-lg bg-white/[0.06]"
              style={{ width: `${Math.max(8, (count / barMax) * 100)}%` }}
            />
          </span>
          <span className="relative flex min-w-0 items-center justify-between gap-3 text-[15px]">
            <span className="min-w-0 flex-1 truncate">{WORLD_NAMES[id] || id.toUpperCase()}</span>
            <span className="shrink-0 tabular-nums text-zinc-400">{formatNumber(count)}</span>
          </span>
        </button>
      ))}
    </>
  );
}

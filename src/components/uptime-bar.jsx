"use client";

import { useMemo } from "react";

function dayKey(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function UptimeBar({ downtimes = [], url, from, days = 90, now = Date.now() }) {
  const cells = useMemo(() => {
    const start = from || now - days * 86400000;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const t = dayKey(now - i * 86400000);
      const end = t + 86400000;
      const hits = downtimes.filter((d) => {
        if (url && d.url !== url) return false;
        const a = d.started_at;
        const b = d.ended_at || now;
        return a < end && b > t && a >= start - 86400000;
      });
      const downMs = hits.reduce((sum, d) => {
        const a = Math.max(d.started_at, t);
        const b = Math.min(d.ended_at || now, end);
        return sum + Math.max(0, b - a);
      }, 0);
      const pct = 1 - downMs / 86400000;
      out.push({ t, pct, down: hits.length > 0 });
    }
    return out;
  }, [downtimes, url, from, days, now]);

  const uptime = cells.length
    ? ((cells.reduce((s, c) => s + c.pct, 0) / cells.length) * 100).toFixed(2)
    : "100.00";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>{days} days</span>
        <span className="tabular-nums text-zinc-200">{uptime}% uptime</span>
      </div>
      <div className="flex h-8 gap-px overflow-hidden rounded-md">
        {cells.map((c) => (
          <div
            key={c.t}
            title={`${new Date(c.t).toISOString().slice(0, 10)} · ${(c.pct * 100).toFixed(2)}%`}
            className={`min-w-0 flex-1 ${
              c.pct > 0.995
                ? "bg-emerald-500"
                : c.pct > 0.9
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

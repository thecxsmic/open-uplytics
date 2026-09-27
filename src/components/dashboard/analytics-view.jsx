"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bone, Group, RowsSkeleton, Segmented } from "@/components/dashboard/ios";
import { useCachedGet } from "@/lib/use-cached-get";
import { formatNumber } from "@/lib/utils";

const GeoMap = dynamic(
  () => import("@/components/dashboard/geo-map").then((mod) => mod.GeoMap),
  {
    loading: () => (
      <Group title="Locations">
        <Bone className="h-52 w-full" />
      </Group>
    ),
  },
);

const RANGES = [
  { value: "24h", label: "Today" },
  { value: "7d", label: "Week" },
  { value: "30d", label: "Month" },
];

function TrafficLine({ points }) {
  const width = 1000;
  const height = 220;
  const inset = 10;
  const values = points.map((point) => point.pageviews);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = inset + (1 - (value - min) / span) * (height - inset * 2);
    return [x, y];
  });
  let line = `M${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const mid = ((x1 + x2) / 2).toFixed(1);
    line += ` C${mid} ${y1.toFixed(1)} ${mid} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  const fill = `${line} L${width} ${height} L0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-48 w-full sm:h-56" preserveAspectRatio="none" role="img" aria-label="Traffic">
      <path d={fill} fill="rgba(255,255,255,0.16)" />
      <path d={line} fill="none" stroke="#fff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...(rows || []).map((row) => row.count || 0));
  return (
    <Group title={title}>
      {!rows?.length ? (
        <p className="px-4 py-4 text-[15px] text-zinc-500">Nothing here yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.name} className="relative min-h-[48px] overflow-hidden px-4 py-3">
            <div className="pointer-events-none absolute inset-y-1.5 right-2 left-2">
              <div
                className="h-full max-w-full rounded-lg bg-white/[0.06]"
                style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }}
              />
            </div>
            <div className="relative flex min-w-0 items-center justify-between gap-3 text-[15px]">
              <span className="min-w-0 flex-1 truncate">{row.name}</span>
              <span className="shrink-0 tabular-nums text-zinc-400">{formatNumber(row.count)}</span>
            </div>
          </div>
        ))
      )}
    </Group>
  );
}

export function AnalyticsView({ siteId, endpoint, snapshot, compact = false }) {
  const [range, setRange] = useState("7d");
  const requestUrl = snapshot
    ? null
    : `${endpoint || `/api/sites/${siteId}/analytics`}${
        (endpoint || "").includes("?") ? "&" : "?"
      }range=${range}`;
  const cached = useCachedGet(requestUrl, { refreshMs: 15000 });
  const data = snapshot ? snapshot[range] || snapshot : cached.data;
  const error = snapshot ? "" : cached.error;

  if (error && !data) return <p className="text-[15px] text-red-400">{error}</p>;
  if (!data) {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading</span>
        <Bone className="h-9 w-full rounded-[10px]" />
        <div className="my-4 grid grid-cols-3 overflow-hidden rounded-[14px] bg-[#1c1c1e]">
          {["Page views", "Visitors", "Here now"].map((label) => (
            <div key={label} className="border-r border-white/[0.08] px-3 py-3 last:border-r-0">
              <div className="text-[12px] text-zinc-500">{label}</div>
              <Bone className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
        <Group title="Traffic">
          <div className="h-48">
            <Bone className="h-full w-full" />
          </div>
        </Group>
        <Group title="Locations">
          <Bone className="h-52 w-full" />
        </Group>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-4 lg:grid-cols-2">
          <Group title="Top pages" busy>
            <RowsSkeleton count={4} />
          </Group>
          <Group title="Referrers" busy>
            <RowsSkeleton count={4} />
          </Group>
        </div>
      </div>
    );
  }

  const chart = (data.series || []).map((point) => ({
    t: new Date(point.t).toISOString().slice(5, 16).replace("T", " "),
    pageviews: point.pageviews,
  }));
  const stats = [
    { label: "Page views", value: formatNumber(data.pageviews) },
    { label: "Visitors", value: formatNumber(data.visitors) },
    { label: "Here now", value: formatNumber(data.live), live: true },
  ];

  return (
    <div>
      <Segmented id="range" label="Time range" value={range} onChange={setRange} options={RANGES} />
      <div className="my-4 grid grid-cols-3 overflow-hidden rounded-[14px] bg-[#1c1c1e]">
        {stats.map((stat) => (
          <div key={stat.label} className="border-r border-white/[0.08] px-3 py-3 last:border-r-0">
            <div className="text-[12px] text-zinc-500">{stat.label}</div>
            <div
              className={`mt-1 text-[22px] font-semibold tabular-nums tracking-tight sm:text-[28px] ${stat.live ? "text-emerald-400" : ""}`}
            >
              {stat.live ? (
                <span className="mr-1 inline-block h-2 w-2 -translate-y-0.5 rounded-full bg-emerald-400 align-middle" />
              ) : null}
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <Group title="Traffic" footer={compact ? undefined : "Totals only. No profile of each visitor."}>
        {compact ? (
          chart.length ? <TrafficLine points={chart} /> : <p className="px-4 text-[15px] text-zinc-500">No traffic in this range.</p>
        ) : (
        <div className="h-48 w-full min-w-0 sm:h-56">
          {chart.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.2)" }}
                  contentStyle={{
                    background: "rgba(28,28,30,0.94)",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  stroke="#fff"
                  strokeWidth={1.75}
                  fill="url(#trafficFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="px-4 text-[15px] text-zinc-500">No traffic in this range.</p>
          )}
        </div>
        )}
      </Group>
      {compact ? null : (
      <>
      <Group
        title="Locations"
        footer="Country only. No city, and no IP address."
      >
        <GeoMap rows={data.countries} />
      </Group>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-x-4 lg:grid-cols-2">
        <Breakdown title="Top pages" rows={data.pages} />
        <Breakdown title="Referrers" rows={data.referrers} />
        <Breakdown
          title="Devices"
          rows={(data.devices || []).map((row) => ({
            ...row,
            name: { m: "Mobile", t: "Tablet", d: "Desktop" }[row.name] || row.name,
          }))}
        />
        <Breakdown title="Browsers" rows={data.browsers} />
        <Breakdown title="Custom events" rows={data.customEvents} />
      </div>
      </>
      )}
    </div>
  );
}

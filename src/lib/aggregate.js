function bump(map, key, n = 1) {
  if (!key) return;
  map[key] = (map[key] || 0) + n;
}

function hostFromRef(ref) {
  if (!ref) return "direct";
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || "direct";
  } catch {
    return "direct";
  }
}

export function aggregateEvents(events) {
  const pages = {};
  const referrers = {};
  const devices = {};
  const browsers = {};
  const os = {};
  const utmSources = {};
  const customEvents = {};
  const countries = {};
  const visitors = new Set();
  let pageviews = 0;

  for (const ev of events || []) {
    if (ev.vid) visitors.add(ev.vid);
    if (ev.n === "pageview") {
      pageviews += 1;
      bump(pages, ev.path || "/");
      bump(referrers, hostFromRef(ev.ref));
      bump(devices, ev.d || "d");
      bump(browsers, ev.b || "other");
      bump(os, ev.os || "other");
      if (/^[A-Z]{2}$/.test(ev.cc)) bump(countries, ev.cc);
      if (ev.utm?.source) bump(utmSources, ev.utm.source);
    } else {
      bump(customEvents, ev.n || "event");
    }
  }

  return {
    pageviews,
    visitors: visitors.size,
    pages,
    referrers,
    devices,
    browsers,
    os,
    utmSources,
    customEvents,
    countries,
  };
}

function mergeMaps(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = (out[k] || 0) + v;
  }
  return out;
}

export function mergeAggregates(existing, incoming) {
  return {
    pageviews: (existing.pageviews || 0) + incoming.pageviews,
    visitors: (existing.visitors || 0) + (incoming.visitors || 0),
    pages: mergeMaps(existing.pages, incoming.pages),
    referrers: mergeMaps(existing.referrers, incoming.referrers),
    devices: mergeMaps(existing.devices, incoming.devices),
    browsers: mergeMaps(existing.browsers, incoming.browsers),
    os: mergeMaps(existing.os, incoming.os),
    utmSources: mergeMaps(existing.utmSources, incoming.utmSources),
    customEvents: mergeMaps(existing.customEvents, incoming.customEvents),
    countries: mergeMaps(existing.countries, incoming.countries),
  };
}

export function topN(map, n = 10) {
  return Object.entries(map || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

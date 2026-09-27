import { hourBucketUtc } from "@/lib/utils";

const HOUR = 3600000;
const DAY = 24 * HOUR;

function asMs(value) {
  return typeof value === "number" ? value : new Date(value).getTime();
}

function dayStart(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function add(map, key, point) {
  const row = map.get(key) || { pageviews: 0, visitors: 0 };
  row.pageviews += Number(point.pageviews) || 0;
  row.visitors += Number(point.visitors) || 0;
  map.set(key, row);
}

function toSeries(slots, map) {
  return slots.map((t) => {
    const row = map.get(t) || { pageviews: 0, visitors: 0 };
    return { t, pageviews: row.pageviews, visitors: row.visitors };
  });
}

function weekSlots(from, now) {
  const end = dayStart(now);
  const slots = [];
  for (let t = dayStart(from); t <= end; t += 7 * DAY) slots.push(t);
  if (!slots.length) slots.push(end);
  return slots;
}

function slotFor(day, slots) {
  let index = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] <= day) index = i;
  }
  return slots[index];
}

export function chartSeries(range, points, now = Date.now()) {
  const list = (Array.isArray(points) ? points : []).filter((point) => Number.isFinite(asMs(point.t)));
  const hasTraffic = list.some(
    (point) => (Number(point.pageviews) || 0) > 0 || (Number(point.visitors) || 0) > 0,
  );
  if (!hasTraffic) return [];

  if (range === "24h") {
    const end = hourBucketUtc(now).getTime();
    const slots = [];
    for (let i = 23; i >= 0; i--) slots.push(end - i * HOUR);
    const map = new Map();
    for (const point of list) {
      const key = hourBucketUtc(asMs(point.t)).getTime();
      if (key < slots[0]) continue;
      if (key > end) continue;
      add(map, key, point);
    }
    return toSeries(slots, map);
  }

  if (range === "30d") {
    const from = now - 30 * DAY;
    const end = dayStart(now);
    const slots = weekSlots(from, now);
    const map = new Map();
    for (const point of list) {
      const day = dayStart(asMs(point.t));
      if (day > end) continue;
      add(map, slotFor(day < slots[0] ? slots[0] : day, slots), point);
    }
    return toSeries(slots, map);
  }

  const end = dayStart(now);
  const slots = [];
  for (let i = 6; i >= 0; i--) slots.push(end - i * DAY);
  const map = new Map();
  for (const point of list) {
    const day = dayStart(asMs(point.t));
    if (day > end) continue;
    add(map, day < slots[0] ? slots[0] : day, point);
  }
  return toSeries(slots, map);
}

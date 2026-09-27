const memory = new Map();
const inflight = new Map();
const listeners = new Map();
const PREFIX = "upl-get:";
const USER_KEY = "upl-cache-user";

export class GetError extends Error {
  constructor(status, body) {
    super(body?.error || "Failed to load");
    this.status = status;
    this.body = body;
  }
}

function storage() {
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

function storageKey(url) {
  return PREFIX + url;
}

function readEntry(url) {
  const hit = memory.get(url);
  if (hit) return hit;
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(storageKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== "number" || !("data" in parsed)) return null;
    memory.set(url, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function emit(url, data) {
  listeners.get(url)?.forEach((fn) => fn(data));
}

export function subscribeGet(url, fn) {
  const set = listeners.get(url) || new Set();
  set.add(fn);
  listeners.set(url, set);
  return () => set.delete(fn);
}

function writeEntry(url, data) {
  const entry = { data, at: Date.now() };
  memory.set(url, entry);
  const store = storage();
  if (store) {
    try {
      if (url === "/api/account" && data?.id) {
        const prev = store.getItem(USER_KEY);
        if (prev && prev !== data.id) {
          clearStored(store);
          memory.clear();
          memory.set(url, entry);
        }
        store.setItem(USER_KEY, data.id);
      }
      store.setItem(storageKey(url), JSON.stringify(entry));
    } catch {
      /* quota or private mode */
    }
  }
  emit(url, data);
}

function clearStored(store) {
  const keys = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && (key.startsWith(PREFIX) || key === USER_KEY)) keys.push(key);
  }
  keys.forEach((key) => store.removeItem(key));
}

export function peekGet(url) {
  if (!url) return undefined;
  const hit = readEntry(url);
  return hit ? hit.data : undefined;
}

export function putGet(url, data) {
  if (!url) return;
  writeEntry(url, data);
}

export function invalidateGet(prefix) {
  if (!prefix) return;
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) memory.delete(key);
  }
  const store = storage();
  if (!store) return;
  const keys = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && key.startsWith(PREFIX) && key.slice(PREFIX.length).startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => store.removeItem(key));
}

export function clearGetCache() {
  memory.clear();
  inflight.clear();
  const store = storage();
  if (store) clearStored(store);
}

export function cachedGet(url, { force = false, maxAge = 20000 } = {}) {
  if (!url) return Promise.reject(new GetError(0, { error: "Missing url" }));
  const hit = readEntry(url);
  if (!force && hit && Date.now() - hit.at < maxAge) return Promise.resolve(hit.data);
  const pending = inflight.get(url);
  if (pending) return pending;
  const task = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) clearGetCache();
      if (!res.ok) throw new GetError(res.status, data);
      writeEntry(url, data);
      return data;
    })
    .finally(() => {
      if (inflight.get(url) === task) inflight.delete(url);
    });
  inflight.set(url, task);
  return task;
}

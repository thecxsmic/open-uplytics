import { nanoid } from "nanoid";

export function id(prefix = "") {
  const n = nanoid(16);
  return prefix ? `${prefix}_${n}` : n;
}

export function siteId() {
  return nanoid(12);
}

export function token() {
  return nanoid(32);
}

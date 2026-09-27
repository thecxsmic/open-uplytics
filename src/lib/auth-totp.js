import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { authSecret } from "@/lib/auth-cookie";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function randomBase32(size = 20) {
  const bytes = randomBytes(size);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input) {
  const clean = String(input || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function totpCode(secret, at = Date.now(), step = 30) {
  const key = base32Decode(secret);
  if (!key?.length) return "";
  const counter = Math.floor(at / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
}

function sameText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyTotp(secret, code, at = Date.now()) {
  const clean = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean) || !secret) return false;
  for (let drift = -1; drift <= 1; drift += 1) {
    if (sameText(totpCode(secret, at + drift * 30_000), clean)) return true;
  }
  return false;
}

export function otpauthUrl(email, secret) {
  const label = encodeURIComponent(`Uplitycs:${email}`);
  const issuer = encodeURIComponent("Uplitycs");
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function aesKey() {
  const secret = authSecret();
  if (!secret) throw new Error("AUTH_SECRET is required");
  return createHash("sha256").update(secret).digest();
}

export function sealSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${enc.toString("base64url")}`;
}

export function openSecret(stored) {
  const [ivB64, tagB64, encB64] = String(stored || "").split(".");
  if (!ivB64 || !tagB64 || !encB64) return "";
  try {
    const decipher = createDecipheriv("aes-256-gcm", aesKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encB64, "base64url")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    return "";
  }
}

export function recoveryCode() {
  const raw = randomBytes(4).toString("hex");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function hashRecoveryCode(code) {
  const clean = String(code || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return createHash("sha256").update(clean).digest("hex");
}

export function normalizeRecoveryCode(code) {
  return String(code || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

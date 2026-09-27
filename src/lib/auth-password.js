import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function passwordError(password, email = "") {
  const value = String(password || "");
  if (value.length < 10) return "Use at least 10 characters.";
  if (value.length > 200) return "That password is too long.";
  if (email && value.toLowerCase() === String(email).toLowerCase()) {
    return "Don't use your email as the password.";
  }
  return "";
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const N = Number(n);
  const rN = Number(r);
  const pN = Number(p);
  if (![N, rN, pN].every((n) => Number.isFinite(n) && n > 0)) return false;
  let salt;
  let expected;
  try {
    salt = Buffer.from(saltB64, "base64url");
    expected = Buffer.from(hashB64, "base64url");
  } catch {
    return false;
  }
  if (!salt.length || expected.length !== 32) return false;
  const actual = await scryptAsync(password, salt, expected.length, {
    N,
    r: rN,
    p: pN,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(expected, actual);
}

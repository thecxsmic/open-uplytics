export const SESSION_COOKIE = "upl_session";
const DEV_SECRET = "dev-only-uplitycs-auth-secret-32b";

export function authSecret() {
  const secret = String(process.env.AUTH_SECRET || "");
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") return "";
  return DEV_SECRET;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function sealSession(sessionId, exp, secret = authSecret()) {
  const body = `${sessionId}.${exp}`;
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function openSession(token, secret = authSecret()) {
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [sessionId, exp, sig] = parts;
  if (!sessionId || !/^\d+$/.test(exp || "")) return null;
  const expected = await hmac(secret, `${sessionId}.${exp}`);
  if (!timingSafeEqualStr(expected, sig)) return null;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  return { sessionId, exp: expiresAt };
}

export function safeNextPath(value) {
  const path = String(value || "");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return "/d";
  }
  return path;
}

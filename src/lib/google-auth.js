import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/auth-cookie";

const STATE_COOKIE = "upl_google";
const ALLOWED_HOSTS = new Set([
  "localhost:3000",
  "uplytics.space",
  "www.uplytics.space",
]);

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function requestOrigin(request) {
  const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const host = rawHost.split(",")[0].trim().toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) return "";
  const forwarded = request.headers.get("x-forwarded-proto");
  const proto = forwarded
    ? forwarded.split(",")[0].trim()
    : host.startsWith("localhost")
      ? "http"
      : "https";
  return `${proto}://${host}`;
}

export function googleRedirectUri(origin) {
  return `${origin}/api/auth/google/callback`;
}

function sign(body) {
  return createHmac("sha256", authSecret()).update(body).digest("base64url");
}

export function sealGoogleState(data) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function openGoogleState(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data?.state || !data?.next || Number(data.exp) < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function googleStateCookie(value, expires) {
  return {
    name: STATE_COOKIE,
    value,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    },
  };
}

export function freshGoogleState(next) {
  return {
    state: randomBytes(16).toString("base64url"),
    next,
    exp: Date.now() + 10 * 60 * 1000,
  };
}

export function googleAuthUrl({ origin, state }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleRedirectUri(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url;
}

export async function exchangeGoogleCode(code, origin) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: googleRedirectUri(origin),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) return null;
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${json.access_token}` },
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.sub) return null;
  return profile;
}

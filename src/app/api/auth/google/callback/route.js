import { NextResponse } from "next/server";
import { texecute } from "@/lib/db";
import { id } from "@/lib/ids";
import {
  ensureDefaultWorkspace,
  findAccountByEmail,
  findAccountByGoogle,
  normalizeEmail,
} from "@/lib/accounts";
import { issueSession } from "@/lib/auth";
import {
  exchangeGoogleCode,
  googleStateCookie,
  openGoogleState,
  requestOrigin,
} from "@/lib/google-auth";

function fail(request, code) {
  const response = NextResponse.redirect(new URL(`/sign-in?error=${code}`, request.url));
  const cookie = googleStateCookie("", new Date(0));
  response.cookies.set(cookie.name, cookie.value, { ...cookie.options, maxAge: 0 });
  return response;
}

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return fail(request, "google_denied");
  const origin = requestOrigin(request);
  const saved = openGoogleState(request.cookies.get("upl_google")?.value);
  const code = url.searchParams.get("code");
  if (!origin || !saved || saved.state !== url.searchParams.get("state") || !code) {
    return fail(request, "google_state");
  }

  const profile = await exchangeGoogleCode(code, origin);
  const email = normalizeEmail(profile?.email);
  const verified = profile?.email_verified === true || profile?.email_verified === "true";
  if (!profile?.sub || !email || !verified) return fail(request, "google_email");

  let account = await findAccountByGoogle(profile.sub);
  if (!account) account = await findAccountByEmail(email);
  if (account?.google_sub && account.google_sub !== profile.sub) {
    return fail(request, "google_linked");
  }

  const now = Date.now();
  const name = String(profile.name || email.split("@")[0]).trim().slice(0, 80) || "User";
  if (!account) {
    const accountId = id("usr");
    await texecute(
      `INSERT INTO accounts (id, email, name, password_hash, google_sub, totp_secret, totp_enabled, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, NULL, 0, ?, ?)`,
      [accountId, email, name, profile.sub, now, now],
    );
    account = { id: accountId, name };
    await ensureDefaultWorkspace(accountId, name);
  } else if (!account.google_sub) {
    await texecute("UPDATE accounts SET google_sub = ?, updated_at = ? WHERE id = ?", [
      profile.sub,
      now,
      account.id,
    ]);
    await ensureDefaultWorkspace(account.id, account.name);
  } else {
    await ensureDefaultWorkspace(account.id, account.name);
  }

  const session = await issueSession(account.id);
  const response = NextResponse.redirect(new URL(saved.next, origin));
  response.cookies.set(session.name, session.value, session.options);
  const cookie = googleStateCookie("", new Date(0));
  response.cookies.set(cookie.name, cookie.value, { ...cookie.options, maxAge: 0 });
  return response;
}

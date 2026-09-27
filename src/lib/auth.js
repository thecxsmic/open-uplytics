import { cookies } from "next/headers";
import { texecute, tquery, row } from "@/lib/db";
import { id } from "@/lib/ids";
import { SESSION_COOKIE, authSecret, openSession, sealSession } from "@/lib/auth-cookie";
import { hashPassword, verifyPassword } from "@/lib/auth-password";
import {
  hashRecoveryCode,
  normalizeRecoveryCode,
  openSecret,
  otpauthUrl,
  randomBase32,
  recoveryCode,
  sealSecret,
  verifyTotp,
} from "@/lib/auth-totp";
import { getAccount } from "@/lib/accounts";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64) || "local";
  return (request.headers.get("x-real-ip") || "local").slice(0, 64);
}

export async function rateLimit(bucket, limit, windowMs) {
  const now = Date.now();
  const current = row(await tquery("SELECT count, reset_at FROM auth_attempts WHERE bucket = ?", [bucket]));
  if (!current || Number(current.reset_at) <= now) {
    await texecute(
      `INSERT INTO auth_attempts (bucket, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
      [bucket, now + windowMs],
    );
    return false;
  }
  if (Number(current.count) >= limit) return true;
  await texecute("UPDATE auth_attempts SET count = count + 1 WHERE bucket = ?", [bucket]);
  return false;
}

function cookieOptions(expires) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  };
}

export async function issueSession(accountId) {
  if (!authSecret()) throw httpError("AUTH_SECRET is required", 500);
  const sessionId = id("ses");
  const now = Date.now();
  const exp = now + SESSION_MS;
  await texecute(
    "INSERT INTO sessions (id, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [sessionId, accountId, exp, now],
  );
  const token = await sealSession(sessionId, exp);
  return {
    name: SESSION_COOKIE,
    value: token,
    options: cookieOptions(new Date(exp)),
  };
}

export async function startSession(accountId) {
  const cookie = await issueSession(accountId);
  const jar = await cookies();
  jar.set(cookie.name, cookie.value, cookie.options);
  return cookie;
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieOptions(new Date(0)), maxAge: 0 });
}

export async function endCurrentSession() {
  const opened = await currentCookie();
  if (opened?.sessionId) {
    await texecute("DELETE FROM sessions WHERE id = ?", [opened.sessionId]);
  }
  await clearSessionCookie();
}

async function currentCookie() {
  const jar = await cookies();
  return openSession(jar.get(SESSION_COOKIE)?.value);
}

export async function readAccount() {
  const opened = await currentCookie();
  if (!opened) return null;
  const session = row(
    await tquery("SELECT account_id, expires_at FROM sessions WHERE id = ?", [opened.sessionId]),
  );
  if (!session || Number(session.expires_at) < Date.now()) return null;
  return getAccount(session.account_id);
}

export async function checkFactor(account, code) {
  const clean = String(code || "").trim();
  if (!clean) return false;
  if (account.totp_enabled && account.totp_secret) {
    const secret = openSecret(account.totp_secret);
    if (secret && verifyTotp(secret, clean)) return "totp";
  }
  const hash = hashRecoveryCode(clean);
  if (normalizeRecoveryCode(clean).length < 8) return false;
  const saved = row(
    await tquery(
      "SELECT code_hash FROM account_recovery_codes WHERE account_id = ? AND code_hash = ? AND used_at IS NULL",
      [account.id, hash],
    ),
  );
  if (!saved) return false;
  await texecute(
    "UPDATE account_recovery_codes SET used_at = ? WHERE account_id = ? AND code_hash = ?",
    [Date.now(), account.id, hash],
  );
  return "recovery";
}

export async function setPassword(accountId, password) {
  const passwordHash = await hashPassword(password);
  await texecute("UPDATE accounts SET password_hash = ?, updated_at = ? WHERE id = ?", [
    passwordHash,
    Date.now(),
    accountId,
  ]);
}

export async function issueRecoveryCodes(accountId) {
  await texecute("DELETE FROM account_recovery_codes WHERE account_id = ?", [accountId]);
  const codes = Array.from({ length: 8 }, () => recoveryCode());
  for (const code of codes) {
    await texecute(
      "INSERT INTO account_recovery_codes (account_id, code_hash, used_at) VALUES (?, ?, NULL)",
      [accountId, hashRecoveryCode(code)],
    );
  }
  return codes;
}

export async function beginTotp(account) {
  if (account.totp_enabled) throw httpError("Authenticator is already on", 409);
  const secret = randomBase32();
  await texecute("UPDATE accounts SET totp_secret = ?, updated_at = ? WHERE id = ?", [
    sealSecret(secret),
    Date.now(),
    account.id,
  ]);
  return { secret, otpauth: otpauthUrl(account.email, secret) };
}

export async function confirmTotp(account, code) {
  const fresh = await getAccount(account.id);
  const secret = openSecret(fresh?.totp_secret);
  if (!secret || !verifyTotp(secret, code)) {
    throw httpError("That code did not match.", 400);
  }
  await texecute("UPDATE accounts SET totp_enabled = 1, updated_at = ? WHERE id = ?", [
    Date.now(),
    account.id,
  ]);
  const codes = await issueRecoveryCodes(account.id);
  return { codes };
}

export async function disableTotp(accountId) {
  await texecute(
    "UPDATE accounts SET totp_secret = NULL, totp_enabled = 0, updated_at = ? WHERE id = ?",
    [Date.now(), accountId],
  );
  await texecute("DELETE FROM account_recovery_codes WHERE account_id = ?", [accountId]);
}

export async function passwordMatches(account, password) {
  if (!account?.password_hash) return false;
  return verifyPassword(password, account.password_hash);
}

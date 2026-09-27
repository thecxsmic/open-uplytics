import { createHash, randomBytes } from "node:crypto";
import { jsonError } from "@/lib/permissions";
import { texecute } from "@/lib/db";
import { findAccountByEmail, normalizeEmail } from "@/lib/accounts";
import { clientIp, rateLimit } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { appUrl } from "@/lib/utils";

const QUIET = {
  ok: true,
  message: "If that account exists, we sent a reset link. It is the backup when the authenticator app is gone.",
};

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const ip = clientIp(request);
    if (await rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    if (!email) return Response.json(QUIET);
    const account = await findAccountByEmail(email);
    if (!account) return Response.json(QUIET);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = Date.now();
    await texecute("DELETE FROM password_resets WHERE account_id = ?", [account.id]);
    await texecute(
      "INSERT INTO password_resets (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      [tokenHash, account.id, now + 30 * 60 * 1000, now],
    );
    const url = `${appUrl()}/sign-in/reset?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(account.email, { url });
    return Response.json(QUIET);
  } catch (err) {
    return jsonError(err);
  }
}

import { createHash } from "node:crypto";
import { jsonError } from "@/lib/permissions";
import { texecute, tquery, row } from "@/lib/db";
import { getAccount, normalizeEmail, publicAccount } from "@/lib/accounts";
import { disableTotp, rateLimit, setPassword, startSession, clientIp } from "@/lib/auth";
import { passwordError } from "@/lib/auth-password";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "");
    const ip = clientIp(request);
    if (await rateLimit(`reset:${ip}`, 8, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    if (token.length < 20) return Response.json({ error: "That reset link is not valid." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const saved = row(
      await tquery("SELECT account_id, expires_at FROM password_resets WHERE token_hash = ?", [tokenHash]),
    );
    if (!saved || Number(saved.expires_at) < Date.now()) {
      return Response.json({ error: "That reset link has expired." }, { status: 400 });
    }
    const account = await getAccount(saved.account_id);
    if (!account) return Response.json({ error: "That reset link is not valid." }, { status: 400 });
    const problem = passwordError(body.password, normalizeEmail(account.email));
    if (problem) return Response.json({ error: problem }, { status: 400 });
    await setPassword(account.id, body.password);
    await disableTotp(account.id);
    await texecute("DELETE FROM password_resets WHERE account_id = ?", [account.id]);
    await texecute("DELETE FROM sessions WHERE account_id = ?", [account.id]);
    await startSession(account.id);
    return Response.json({
      ...publicAccount({ ...account, totp_enabled: 0, password_hash: "set" }),
      totpCleared: true,
    });
  } catch (err) {
    return jsonError(err);
  }
}

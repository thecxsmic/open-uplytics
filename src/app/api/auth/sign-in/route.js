import { jsonError } from "@/lib/permissions";
import { ensureDefaultWorkspace, findAccountByEmail, normalizeEmail, publicAccount } from "@/lib/accounts";
import { checkFactor, clientIp, passwordMatches, rateLimit, startSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const ip = clientIp(request);
    if (!email) return Response.json({ error: "Email or password is wrong." }, { status: 401 });
    if (await rateLimit(`signin:${email}:${ip}`, 8, 15 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const account = await findAccountByEmail(email);
    const ok = account ? await passwordMatches(account, body.password) : false;
    if (!ok) return Response.json({ error: "Email or password is wrong." }, { status: 401 });
    if (account.totp_enabled) {
      if (!String(body.code || "").trim()) return Response.json({ totp: true });
      const factor = await checkFactor(account, body.code);
      if (!factor) return Response.json({ error: "That code did not match." }, { status: 401 });
    }
    await ensureDefaultWorkspace(account.id, account.name);
    await startSession(account.id);
    return Response.json(publicAccount(account));
  } catch (err) {
    return jsonError(err);
  }
}

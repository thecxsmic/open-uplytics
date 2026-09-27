import { jsonError } from "@/lib/permissions";
import { texecute } from "@/lib/db";
import { id } from "@/lib/ids";
import { ensureDefaultWorkspace, findAccountByEmail, normalizeEmail } from "@/lib/accounts";
import { hashPassword, passwordError } from "@/lib/auth-password";
import { clientIp, rateLimit, startSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const ip = clientIp(request);
    if (await rateLimit(`signup:${ip}`, 8, 60 * 60 * 1000)) {
      return Response.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "Enter your name." }, { status: 400 });
    if (!email) return Response.json({ error: "Enter a valid email." }, { status: 400 });
    const problem = passwordError(body.password, email);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    if (await findAccountByEmail(email)) {
      return Response.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    const now = Date.now();
    const accountId = id("usr");
    await texecute(
      `INSERT INTO accounts (id, email, name, password_hash, totp_secret, totp_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, 0, ?, ?)`,
      [accountId, email, name, await hashPassword(body.password), now, now],
    );
    await ensureDefaultWorkspace(accountId, name);
    await startSession(accountId);
    return Response.json({ id: accountId, email, name, totpEnabled: false });
  } catch (err) {
    return jsonError(err);
  }
}

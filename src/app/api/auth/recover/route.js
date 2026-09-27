import { jsonError } from "@/lib/permissions";
import { ensureDefaultWorkspace, findAccountByEmail, normalizeEmail, publicAccount } from "@/lib/accounts";
import { checkFactor, clientIp, rateLimit, setPassword, startSession } from "@/lib/auth";
import { passwordError } from "@/lib/auth-password";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body.email);
    const ip = clientIp(request);
    if (!email || (await rateLimit(`recover:${email}:${ip}`, 8, 15 * 60 * 1000))) {
      return Response.json(
        { error: email ? "Too many attempts. Try again later." : "Email or code did not match." },
        { status: email ? 429 : 401 },
      );
    }
    const problem = passwordError(body.password, email);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    const account = await findAccountByEmail(email);
    const factor = account ? await checkFactor(account, body.code) : false;
    if (!factor) return Response.json({ error: "Email or code did not match." }, { status: 401 });
    await setPassword(account.id, body.password);
    await ensureDefaultWorkspace(account.id, account.name);
    await startSession(account.id);
    return Response.json(publicAccount({ ...account, password_hash: "set" }));
  } catch (err) {
    return jsonError(err);
  }
}

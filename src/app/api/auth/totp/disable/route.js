import { jsonError } from "@/lib/permissions";
import { requireUserProfile } from "@/lib/session";
import { checkFactor, disableTotp, passwordMatches } from "@/lib/auth";
import { getAccount } from "@/lib/accounts";

export async function POST(request) {
  try {
    const user = await requireUserProfile();
    const body = await request.json().catch(() => ({}));
    const account = await getAccount(user.id);
    if (!(await passwordMatches(account, body.password))) {
      return Response.json({ error: "Password is wrong." }, { status: 401 });
    }
    if (account.totp_enabled) {
      const factor = await checkFactor(account, body.code);
      if (!factor) return Response.json({ error: "That code did not match." }, { status: 401 });
    }
    await disableTotp(account.id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

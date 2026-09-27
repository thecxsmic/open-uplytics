import { jsonError } from "@/lib/permissions";
import { texecute } from "@/lib/db";
import { getAccount, publicAccount } from "@/lib/accounts";
import { passwordMatches, setPassword } from "@/lib/auth";
import { passwordError } from "@/lib/auth-password";
import { requireUserProfile } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUserProfile();
    return Response.json(user);
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request) {
  try {
    const user = await requireUserProfile();
    const account = await getAccount(user.id);
    const body = await request.json().catch(() => ({}));
    const name = body.name == null ? "" : String(body.name).trim().slice(0, 80);
    if (body.name != null) {
      if (!name) return Response.json({ error: "Enter your name." }, { status: 400 });
      await texecute("UPDATE accounts SET name = ?, updated_at = ? WHERE id = ?", [
        name,
        Date.now(),
        account.id,
      ]);
    }
    if (body.newPassword) {
      if (account.password_hash && !(await passwordMatches(account, body.currentPassword))) {
        return Response.json({ error: "Current password is wrong." }, { status: 401 });
      }
      const problem = passwordError(body.newPassword, account.email);
      if (problem) return Response.json({ error: problem }, { status: 400 });
      await setPassword(account.id, body.newPassword);
    }
    return Response.json(publicAccount(await getAccount(account.id)));
  } catch (err) {
    return jsonError(err);
  }
}

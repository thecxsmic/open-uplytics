import { jsonError } from "@/lib/permissions";
import { requireUserProfile } from "@/lib/session";
import { confirmTotp } from "@/lib/auth";
import { getAccount } from "@/lib/accounts";

export async function POST(request) {
  try {
    const user = await requireUserProfile();
    const body = await request.json().catch(() => ({}));
    const account = await getAccount(user.id);
    const { codes } = await confirmTotp(account, body.code);
    return Response.json({ ok: true, codes });
  } catch (err) {
    return jsonError(err);
  }
}

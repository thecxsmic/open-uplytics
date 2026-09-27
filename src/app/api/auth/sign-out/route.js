import { jsonError } from "@/lib/permissions";
import { endCurrentSession, readAccount } from "@/lib/auth";
import { texecute } from "@/lib/db";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.everywhere) {
      const account = await readAccount();
      if (account) await texecute("DELETE FROM sessions WHERE account_id = ?", [account.id]);
    }
    await endCurrentSession();
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

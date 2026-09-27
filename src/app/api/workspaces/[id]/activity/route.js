import { requireUser } from "@/lib/session";
import { jsonError, requireMember } from "@/lib/permissions";
import { tquery } from "@/lib/db";
import { getAccounts } from "@/lib/accounts";

export async function GET(_req, { params }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await requireMember(user.id, id, "workspace.read");
    const rows = await tquery(
      `SELECT a.* FROM activity_log a
       WHERE a.workspace_id = ? ORDER BY a.created_at DESC LIMIT 50`,
      [id],
    );
    const profiles = await getAccounts(rows.map((a) => a.user_id));
    const activity = rows.map((a) => ({
      ...a,
      email: profiles[a.user_id]?.email || "",
      name: profiles[a.user_id]?.name || "",
    }));
    return Response.json({ activity });
  } catch (err) {
    return jsonError(err);
  }
}

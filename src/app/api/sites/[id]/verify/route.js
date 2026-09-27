import { requireUser } from "@/lib/session";
import { jsonError, siteAccess } from "@/lib/permissions";
import { texecute, logActivity } from "@/lib/db";
import { verifySite } from "@/lib/verify-site";
import { assertNotDemoSite } from "@/lib/demo";

export async function POST(_req, { params }) {
  try {
    const user = await requireUser();
    const { id: siteId } = await params;
    const { site } = await siteAccess(user.id, siteId);
    await assertNotDemoSite(siteId);
    const result = await verifySite({
      domain: site.domain,
      siteId: site.id,
      verificationToken: site.verification_token,
    });
    if (!result.ok) {
      return Response.json(
        { ok: false, error: "Verification not found", methods: result.methods },
        { status: 400 },
      );
    }
    await texecute("UPDATE sites SET verified = 1 WHERE id = ?", [siteId]);
    await logActivity(site.workspace_id, user.id, "site.verified", { siteId });
    return Response.json({ ok: true, methods: result.methods });
  } catch (err) {
    return jsonError(err);
  }
}

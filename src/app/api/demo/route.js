import { getDemoPayload } from "@/lib/demo";
import { jsonError } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getDemoPayload();
    if (!payload) {
      return Response.json(
        { error: "Demo workspace is not seeded", hint: "npm run db:demo" },
        { status: 404 },
      );
    }
    return Response.json({
      workspace: {
        id: payload.workspace.id,
        name: payload.workspace.name,
        slug: payload.workspace.slug,
        is_demo: true,
      },
      sites: payload.sites,
    });
  } catch (err) {
    return jsonError(err);
  }
}

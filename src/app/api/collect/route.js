import { ingestEvents } from "@/lib/collect";
import { countryFromHeaders } from "@/lib/geo";

export const dynamic = "force-dynamic";

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new Response(null, { status: 204 }));
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return cors(Response.json({ error: "invalid json" }, { status: 400 }));
  }

  const result = await ingestEvents({
    body,
    originHeader: request.headers.get("origin"),
    refererHeader: request.headers.get("referer"),
    countryCode: countryFromHeaders(request.headers),
  });

  if (result.status === 204) {
    return cors(new Response(null, { status: 204 }));
  }
  return cors(Response.json(result.json, { status: result.status }));
}

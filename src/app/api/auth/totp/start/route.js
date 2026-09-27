import QRCode from "qrcode";
import { jsonError } from "@/lib/permissions";
import { requireUserProfile } from "@/lib/session";
import { beginTotp } from "@/lib/auth";
import { getAccount } from "@/lib/accounts";

export async function POST() {
  try {
    const user = await requireUserProfile();
    const account = await getAccount(user.id);
    const { secret, otpauth } = await beginTotp(account);
    const svg = await QRCode.toString(otpauth, {
      type: "svg",
      margin: 1,
      width: 180,
      color: { dark: "#ffffff", light: "#00000000" },
    });
    return Response.json({ secret, otpauth, svg });
  } catch (err) {
    return jsonError(err);
  }
}

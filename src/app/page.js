import { redirect } from "next/navigation";
import { optionalUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await optionalUser();
  redirect(user ? "/d" : "/sign-in");
}

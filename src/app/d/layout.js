import { redirect } from "next/navigation";
import { optionalUser } from "@/lib/session";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }) {
  const user = await optionalUser();
  if (!user) redirect("/sign-in?next=/d");
  return children;
}

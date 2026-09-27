import { NextResponse } from "next/server";
import { SESSION_COOKIE, authSecret, openSession } from "@/lib/auth-cookie";

export default async function proxy(request) {
  const path = request.nextUrl.pathname;
  const needsAuth =
    path === "/d" || path.startsWith("/d/") || path === "/account" || path.startsWith("/account/");
  if (!needsAuth) return NextResponse.next();
  const opened = await openSession(request.cookies.get(SESSION_COOKIE)?.value, authSecret());
  if (opened) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(path)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

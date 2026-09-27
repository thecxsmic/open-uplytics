import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth-cookie";
import {
  freshGoogleState,
  googleAuthUrl,
  googleConfigured,
  googleStateCookie,
  requestOrigin,
  sealGoogleState,
} from "@/lib/google-auth";

export async function GET(request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/sign-in?error=google_config", request.url));
  }
  const origin = requestOrigin(request);
  if (!origin) {
    return NextResponse.redirect(new URL("/sign-in?error=google_host", request.url));
  }
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const payload = freshGoogleState(next);
  const url = googleAuthUrl({ origin, state: payload.state });
  const response = NextResponse.redirect(url);
  const cookie = googleStateCookie(sealGoogleState(payload), new Date(payload.exp));
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

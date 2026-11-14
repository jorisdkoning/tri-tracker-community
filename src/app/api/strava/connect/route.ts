import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { buildAuthorizeUrl } from "@/lib/strava";
import { STRAVA_OAUTH_STATE_COOKIE } from "@/lib/strava-state";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  const state = randomBytes(24).toString("base64url");
  const redirectUri = new URL("/api/strava/callback", request.nextUrl).toString();

  const response = NextResponse.redirect(buildAuthorizeUrl(redirectUri, state));
  response.cookies.set(STRAVA_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}

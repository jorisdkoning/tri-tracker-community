import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { exchangeCode } from "@/lib/strava";
import { STRAVA_OAUTH_STATE_COOKIE } from "@/lib/strava-state";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  const expectedState = request.cookies.get(STRAVA_OAUTH_STATE_COOKIE)?.value;
  const state = request.nextUrl.searchParams.get("state");
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.delete(STRAVA_OAUTH_STATE_COOKIE);
    return response;
  };

  if (!expectedState || !state || state !== expectedState) {
    return clearStateCookie(
      NextResponse.redirect(
        new URL("/settings?strava_error=invalid_state", request.nextUrl)
      )
    );
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    return clearStateCookie(
      NextResponse.redirect(
        new URL("/settings?strava_error=denied", request.nextUrl)
      )
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return clearStateCookie(
      NextResponse.redirect(
        new URL("/settings?strava_error=missing_code", request.nextUrl)
      )
    );
  }

  try {
    const tokens = await exchangeCode(code);
    await prisma.stravaAccount.upsert({
      where: { userId: session.user.id },
      update: {
        athleteId: tokens.athleteId,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
      },
      create: {
        userId: session.user.id,
        athleteId: tokens.athleteId,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: encrypt(tokens.refreshToken),
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return clearStateCookie(
        NextResponse.redirect(new URL("/settings?strava_error=taken", request.nextUrl))
      );
    }
    console.error("Strava token exchange failed", err);
    return clearStateCookie(
      NextResponse.redirect(
        new URL("/settings?strava_error=exchange_failed", request.nextUrl)
      )
    );
  }

  return clearStateCookie(
    NextResponse.redirect(new URL("/settings", request.nextUrl))
  );
}

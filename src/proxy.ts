import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // api/ingest and api/mcp are excluded from session auth: they are called by
  // Health Auto Export and by Claude, and protected by their own secrets.
  matcher: [
    "/((?!api/auth|api/ingest|api/mcp|api/cron|api/calendar|\\.well-known|manifest.webmanifest|icon|apple-icon|login|_next/static|_next/image|favicon.ico).*)",
  ],
};

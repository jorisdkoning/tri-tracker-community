import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const proxy = auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // api/ingest, api/mcp and api/calendar are called by Health Auto Export,
  // Claude and calendar apps, and are protected by each user's personal link.
  // login, signup, reset and privacy are the public pages.
  matcher: [
    "/((?!api/auth|api/ingest|api/mcp|api/cron|api/calendar|\\.well-known|manifest.webmanifest|icon|apple-icon|login|signup|reset|privacy|sw.js|_next/static|_next/image|favicon.ico).*)",
  ],
};

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runIntervalsSync, runStravaSync } from "@/lib/sync";

import { safeEqual } from "@/lib/secrets";
export const runtime = "nodejs";
export const maxDuration = 60;

// Daily incremental sync: only the last couple of weeks, since the manual
// button in Settings already covers the full year.
const CRON_WINDOW_DAYS = 14;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const provided = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return safeEqual(provided, expected);
}

async function attempt<T>(job: () => Promise<T>) {
  try {
    return { ok: true as const, ...(await job()) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    console.error("[cron] sync failed:", message);
    return { ok: false as const, error: message };
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) return NextResponse.json({ error: "No user" }, { status: 409 });

  const [strava, intervals] = await Promise.all([
    attempt(() => runStravaSync(user.id, CRON_WINDOW_DAYS)),
    attempt(() => runIntervalsSync(user.id, CRON_WINDOW_DAYS)),
  ]);

  for (const path of ["/", "/training", "/health", "/settings"]) revalidatePath(path);

  console.log("[cron] sync done", JSON.stringify({ strava, intervals }));
  return NextResponse.json({ strava, intervals });
}

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runIntervalsSync, runStravaSync } from "@/lib/sync";
import { orderForSync } from "@/lib/cron-order";
import { safeEqual } from "@/lib/secrets";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily incremental sync for every connected user: only the last couple of
// weeks, since the button in Settings already covers the full year.
const CRON_WINDOW_DAYS = 14;
// Stop starting new users after this, so the run ends before maxDuration.
const TIME_BUDGET_MS = 45_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

async function attempt(job: () => Promise<unknown>): Promise<boolean> {
  try {
    await job();
    return true;
  } catch (error) {
    console.error("[cron] sync failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const rows = await prisma.user.findMany({
    where: { OR: [{ intervalsAccount: { isNot: null } }, { stravaAccount: { isNot: null } }] },
    select: {
      id: true,
      intervalsAccount: { select: { lastSyncAt: true } },
      stravaAccount: { select: { lastSyncAt: true } },
    },
  });
  const users = orderForSync(
    rows.map((r) => ({
      id: r.id,
      intervalsLastSync: r.intervalsAccount ? r.intervalsAccount.lastSyncAt : undefined,
      stravaLastSync: r.stravaAccount ? r.stravaAccount.lastSyncAt : undefined,
    }))
  );

  let synced = 0;
  let failures = 0;
  for (const user of users) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const jobs = [];
    if (user.stravaLastSync !== undefined) jobs.push(attempt(() => runStravaSync(user.id, CRON_WINDOW_DAYS)));
    if (user.intervalsLastSync !== undefined) jobs.push(attempt(() => runIntervalsSync(user.id, CRON_WINDOW_DAYS)));
    const results = await Promise.all(jobs);
    failures += results.filter((ok) => !ok).length;
    synced++;
  }

  for (const path of ["/", "/training", "/health", "/settings"]) revalidatePath(path);

  const summary = { users: users.length, synced, failures };
  console.log("[cron] sync done", JSON.stringify(summary));
  return NextResponse.json(summary);
}

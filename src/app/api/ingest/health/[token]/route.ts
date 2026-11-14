import { NextResponse } from "next/server";
import { aggregateDailyMetrics, extractPayload } from "@/lib/health-parse";
import { importWorkouts, saveDailyMetrics } from "@/lib/health-ingest";
import { findUserByLinkToken } from "@/lib/tokens";

export const runtime = "nodejs";

// Receives the Health Auto Export app's REST push. The phone has no browser
// session, so the user's personal HEALTH link token in the URL is the credential.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const user = await findUserByLinkToken("HEALTH", token);
  if (!user) {
    console.warn("[ingest] rejected: unknown link");
    return NextResponse.json({ error: "Unknown link" }, { status: 404 });
  }

  const payload = extractPayload(await request.json().catch(() => null));
  if (!payload) {
    return NextResponse.json(
      { error: "Expected Health Auto Export JSON with data.metrics or data.workouts" },
      { status: 400 }
    );
  }

  const perDay = aggregateDailyMetrics(payload.metrics);
  await saveDailyMetrics(user.id, perDay);
  const { swimCount, gymCount, skipped } = await importWorkouts(user.id, payload.workouts);

  // Counts and workout type names only (never health values or user ids).
  console.log(
    "[ingest]",
    JSON.stringify({
      metrics: payload.metrics.length,
      workouts: payload.workouts.length,
      swim: swimCount,
      gym: gymCount,
      skippedTypes: [...new Set(skipped)].slice(0, 10),
    })
  );

  return NextResponse.json({
    ok: true,
    daysUpdated: perDay.size,
    swimWorkouts: swimCount,
    gymWorkouts: gymCount,
  });
}

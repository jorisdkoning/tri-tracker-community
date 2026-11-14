import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeEqual } from "@/lib/secrets";
import { aggregateDailyMetrics, extractPayload } from "@/lib/health-parse";
import { importWorkouts, saveDailyMetrics } from "@/lib/health-ingest";

export const runtime = "nodejs";

// Receives the Health Auto Export app's REST push. Protected by an API key
// (x-api-key), not by the session, because the phone has no browser session.
export async function POST(request: Request) {
  const apiKey = process.env.HEALTH_INGEST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Ingestion is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-api-key") ?? "";
  if (!safeEqual(provided, apiKey)) {
    console.warn("[ingest] rejected: bad or missing x-api-key");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "No user exists yet" }, { status: 409 });
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

  // Counts and workout type names only (never health values), so a missing
  // workout can be traced to "not sent" vs "sent but not recognised".
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

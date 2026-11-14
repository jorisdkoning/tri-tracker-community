import { prisma } from "@/lib/prisma";
import { computeNutritionInsights, nutritionInsightsText } from "@/lib/nutrition-insights";

import { formatDuration } from "@/lib/format";
function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function daysUntil(date: Date) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

// Builds a plain-text summary of the athlete's real data for the coach prompt.
// Kept as readable prose/tables rather than raw JSON so the model doesn't have
// to do its own parsing of the data shape.
export async function buildCoachContext(userId: string): Promise<string> {
  const now = new Date();
  const since90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const [fitnessHistory, recentActivities, dailyMetrics, upcomingRaces, monthExpenses, planned, gymSessions, checkIns] =
    await Promise.all([
      prisma.fitnessMetric.findMany({
        where: { userId, date: { gte: since90 } },
        orderBy: { date: "asc" },
      }),
      prisma.activity.findMany({
        where: { userId, startDate: { gte: since28 } },
        orderBy: { startDate: "desc" },
      }),
      prisma.dailyMetric.findMany({
        where: { userId, date: { gte: since30 } },
        orderBy: { date: "asc" },
      }),
      prisma.race.findMany({
        where: { userId, date: { gte: now } },
        orderBy: { date: "asc" },
        take: 3,
      }),
      prisma.expense.aggregate({
        where: { userId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.plannedWorkout.findMany({
        where: {
          userId,
          date: { gte: new Date(now.toISOString().slice(0, 10)), lt: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000) },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.gymSession.findMany({
        where: { userId, date: { gte: since28 } },
        orderBy: { date: "desc" },
        select: { date: true, notes: true, durationSec: true },
      }),
      prisma.checkIn.findMany({
        where: { userId, date: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: "desc" },
        select: { date: true, feeling: true, note: true },
      }),
    ]);

  const latest = fitnessHistory.at(-1);
  const monthAgo = fitnessHistory.find((f) => f.date >= since30) ?? fitnessHistory[0];

  const lines: string[] = [];

  lines.push("## Overall fitness (CTL/ATL/TSB, blended across all sports)");
  if (latest) {
    lines.push(
      `Today: CTL (fitness) ${latest.ctl.toFixed(1)}, ATL (fatigue) ${latest.atl.toFixed(1)}, TSB (form) ${latest.tsb.toFixed(1)}.`
    );
    if (monthAgo && monthAgo.date.getTime() !== latest.date.getTime()) {
      lines.push(
        `~30 days ago: CTL ${monthAgo.ctl.toFixed(1)}, ATL ${monthAgo.atl.toFixed(1)}, TSB ${monthAgo.tsb.toFixed(1)}.`
      );
    }
  } else {
    lines.push("No fitness data yet.");
  }

  lines.push("");
  lines.push("## Activities in the last 28 days");
  if (recentActivities.length === 0) {
    lines.push("No activities logged.");
  } else {
    const bySport = new Map<string, { count: number; time: number }>();
    for (const a of recentActivities) {
      const entry = bySport.get(a.sport) ?? { count: 0, time: 0 };
      entry.count++;
      entry.time += a.movingTime;
      bySport.set(a.sport, entry);
    }
    for (const [sport, { count, time }] of bySport) {
      lines.push(`- ${sport}: ${count} session(s), ${formatDuration(time)} total`);
    }
    lines.push("Most recent sessions:");
    for (const a of recentActivities.slice(0, 8)) {
      const details = [
        `${formatDuration(a.movingTime)}`,
        `${(a.distance / 1000).toFixed(1)}km`,
        a.elevationGain ? `${Math.round(a.elevationGain)}m elevation` : null,
        a.avgHr ? `avg HR ${Math.round(a.avgHr)}` : null,
        a.avgPower ? `avg power ${Math.round(a.avgPower)}W` : null,
        a.avgCadence ? `cadence ${Math.round(a.avgCadence)}` : null,
        a.trainingLoad ? `effort ${Math.round(a.trainingLoad)}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      lines.push(`- ${a.startDate.toISOString().slice(0, 10)} ${a.sport} "${a.name}": ${details}`);
    }
  }

  lines.push("");
  lines.push("## Strength training (gym, last 28 days)");
  if (gymSessions.length === 0) {
    lines.push("No gym sessions logged.");
  } else {
    for (const g of gymSessions) {
      lines.push(
        `- ${g.date.toISOString().slice(0, 10)} ${g.notes ?? "strength session"}${g.durationSec ? `, ${formatDuration(g.durationSec)}` : ""}`
      );
    }
  }

  lines.push("");
  lines.push("## How the athlete says they feel (self-reported, 1 = wrecked, 5 = great, last 14 days)");
  if (checkIns.length === 0) {
    lines.push("No check-ins yet.");
  } else {
    for (const c of checkIns) {
      lines.push(`- ${c.date.toISOString().slice(0, 10)}: ${c.feeling}/5${c.note ? ` (${c.note})` : ""}`);
    }
  }

  lines.push("");
  lines.push("## Health metrics");
  const hrvRecent = avg(dailyMetrics.filter((m) => m.date >= since7 && m.hrv != null).map((m) => m.hrv!));
  const hrvBaseline = avg(dailyMetrics.filter((m) => m.hrv != null).map((m) => m.hrv!));
  const rhrRecent = avg(dailyMetrics.filter((m) => m.date >= since7 && m.restingHr != null).map((m) => m.restingHr!));
  const rhrBaseline = avg(dailyMetrics.filter((m) => m.restingHr != null).map((m) => m.restingHr!));
  const sleepRecent = avg(dailyMetrics.filter((m) => m.date >= since7 && m.sleepHours != null).map((m) => m.sleepHours!));
  const latestWeight = [...dailyMetrics].reverse().find((m) => m.weightKg != null)?.weightKg;

  if (hrvRecent != null) lines.push(`HRV, last 7 days avg: ${hrvRecent}ms (30-day baseline: ${hrvBaseline}ms).`);
  if (rhrRecent != null) lines.push(`Resting HR, last 7 days avg: ${rhrRecent}bpm (30-day baseline: ${rhrBaseline}bpm).`);
  if (sleepRecent != null) lines.push(`Sleep, last 7 days avg: ${sleepRecent}h/night.`);
  if (latestWeight != null) lines.push(`Latest weight: ${latestWeight}kg.`);
  if (hrvRecent == null && rhrRecent == null && sleepRecent == null && latestWeight == null) {
    lines.push("No health data yet.");
  }

  lines.push("");
  lines.push("## Upcoming goal races");
  if (upcomingRaces.length === 0) {
    lines.push("None scheduled.");
  } else {
    for (const race of upcomingRaces) {
      lines.push(
        `- ${race.name} (${race.distanceType}) in ${daysUntil(race.date)} days${race.goal ? `, goal: ${race.goal}` : ""}`
      );
    }
  }

  lines.push("");
  lines.push("## Planned workouts (next 21 days, from the intervals.icu calendar)");
  if (planned.length === 0) {
    lines.push("Nothing planned.");
  } else {
    for (const workout of planned) {
      lines.push(
        `- ${workout.date.toISOString().slice(0, 10)}${workout.startTime ? ` ${workout.startTime}` : ""} ${workout.sport} "${workout.name}"${workout.durationSec ? `, ${formatDuration(workout.durationSec)}` : ""}`
      );
    }
  }

  lines.push("");
  lines.push("## Nutrition (last 14 completed days, against targets that follow training)");
  try {
    lines.push(...nutritionInsightsText(await computeNutritionInsights(userId, 14)));
  } catch {
    lines.push("Nutrition summary unavailable.");
  }

  lines.push("");
  lines.push("## Budget");
  lines.push(`Spent this month: €${(monthExpenses._sum.amount ?? 0).toFixed(2)}.`);

  return lines.join("\n");
}

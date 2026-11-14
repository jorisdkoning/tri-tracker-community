import type { Goal } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface GoalProgress {
  currentValue: number | null;
  unit: string;
  // Fraction of the way from "no progress" to target, clamped 0-1. Null when
  // there's no baseline data to measure from (e.g. CUSTOM metric).
  pct: number | null;
}

const WINDOW_DAYS = 28;

export async function computeGoalProgress(
  userId: string,
  goal: Pick<Goal, "metric" | "targetValue" | "direction">
): Promise<GoalProgress> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  switch (goal.metric) {
    case "CYCLING_SPEED_KMH": {
      const activities = await prisma.activity.findMany({
        where: { userId, sport: "BIKE", startDate: { gte: since }, avgSpeed: { not: null } },
        select: { avgSpeed: true },
      });
      if (activities.length === 0) return { currentValue: null, unit: "km/h", pct: null };
      const avgMs =
        activities.reduce((sum, a) => sum + (a.avgSpeed ?? 0), 0) / activities.length;
      const currentValue = Math.round(avgMs * 3.6 * 10) / 10;
      return {
        currentValue,
        unit: "km/h",
        pct: clampPct(currentValue / goal.targetValue),
      };
    }

    case "SWIM_PACE_SEC_PER_100M": {
      const activities = await prisma.activity.findMany({
        where: { userId, sport: "SWIM", startDate: { gte: since }, distance: { gt: 0 } },
        select: { movingTime: true, distance: true },
      });
      if (activities.length === 0) return { currentValue: null, unit: "s/100m", pct: null };
      const totalSec = activities.reduce((sum, a) => sum + a.movingTime, 0);
      const totalM = activities.reduce((sum, a) => sum + a.distance, 0);
      const currentValue = Math.round((totalSec / (totalM / 100)) * 10) / 10;
      // Lower is better: progress = target / current (capped at 1)
      return {
        currentValue,
        unit: "s/100m",
        pct: clampPct(goal.targetValue / currentValue),
      };
    }

    case "RUN_PACE_SEC_PER_KM": {
      const activities = await prisma.activity.findMany({
        where: { userId, sport: "RUN", startDate: { gte: since }, distance: { gt: 0 } },
        select: { movingTime: true, distance: true },
      });
      if (activities.length === 0) return { currentValue: null, unit: "s/km", pct: null };
      const totalSec = activities.reduce((sum, a) => sum + a.movingTime, 0);
      const totalKm = activities.reduce((sum, a) => sum + a.distance, 0) / 1000;
      const currentValue = Math.round((totalSec / totalKm) * 10) / 10;
      return {
        currentValue,
        unit: "s/km",
        pct: clampPct(goal.targetValue / currentValue),
      };
    }

    case "WEIGHT_KG": {
      const latest = await prisma.dailyMetric.findFirst({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "desc" },
        select: { weightKg: true },
      });
      if (!latest?.weightKg) return { currentValue: null, unit: "kg", pct: null };
      const pct =
        goal.direction === "INCREASE"
          ? clampPct(latest.weightKg / goal.targetValue)
          : clampPct(goal.targetValue / latest.weightKg);
      return { currentValue: latest.weightKg, unit: "kg", pct };
    }

    case "CUSTOM":
    default:
      return { currentValue: null, unit: "", pct: null };
  }
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function formatPaceSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

import { prisma } from "@/lib/prisma";
import {
  getDailyTargets,
  type TrainingLoadTier,
} from "@/lib/nutrition";

import { DAY_MS } from "@/lib/time";
const TIERS: TrainingLoadTier[] = ["rest", "light", "moderate", "heavy"];
// Strength work burns less and needs less fuel per minute than endurance.
const GYM_MINUTE_WEIGHT = 0.5;

export interface NutritionPlan {
  tier: TrainingLoadTier;
  enduranceMin: number;
  gymMin: number;
  targets: { calories: number; carbsG: number; proteinG: number };
  reasons: string[];
}

function tierForMinutes(minutes: number): TrainingLoadTier {
  if (minutes < 10) return "rest";
  if (minutes < 60) return "light";
  if (minutes < 120) return "moderate";
  return "heavy";
}

async function trainingMinutes(userId: string, start: Date, end: Date) {
  const [activities, gym] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startDate: { gte: start, lt: end } },
      select: { movingTime: true },
    }),
    prisma.gymSession.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { durationSec: true },
    }),
  ]);
  const enduranceMin = activities.reduce((sum, a) => sum + a.movingTime, 0) / 60;
  const gymMin = gym.reduce((sum, g) => sum + (g.durationSec ?? 0), 0) / 60;
  return { enduranceMin, gymMin, effective: enduranceMin + gymMin * GYM_MINUTE_WEIGHT };
}

// `day` is a YYYY-MM-DD string in the user's local timezone.
export async function computeNutritionPlan(
  userId: string,
  day: string
): Promise<NutritionPlan> {
  const start = new Date(day);
  const end = new Date(start.getTime() + DAY_MS);
  const yesterday = new Date(start.getTime() - DAY_MS);
  const raceWindowEnd = new Date(start.getTime() + 3 * DAY_MS);

  const [today, prior, latestWeight, profile, nextRace, plannedAhead] = await Promise.all([
    trainingMinutes(userId, start, end),
    trainingMinutes(userId, yesterday, start),
    prisma.dailyMetric.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { weightKg: true } }),
    prisma.race.findFirst({
      where: { userId, date: { gte: start, lt: raceWindowEnd } },
      orderBy: { date: "asc" },
      select: { name: true, date: true },
    }),
    prisma.plannedWorkout.findMany({
      where: { userId, date: { gte: start, lt: new Date(start.getTime() + 2 * DAY_MS) } },
      select: { date: true, sport: true, name: true, durationSec: true },
    }),
  ]);

  const plannedMin = (from: Date, to: Date) =>
    plannedAhead
      .filter((w) => w.date >= from && w.date < to)
      .reduce((sum, w) => sum + (w.durationSec ?? 0), 0) / 60;
  const plannedToday = plannedMin(start, end);
  const plannedTomorrow = plannedMin(end, new Date(end.getTime() + DAY_MS));

  const reasons: string[] = [];
  let tier = tierForMinutes(Math.max(today.effective, plannedToday));
  const parts = [`${Math.round(today.enduranceMin)} min of swim/bike/run`];
  if (today.gymMin > 0) parts.push(`${Math.round(today.gymMin)} min of gym`);
  reasons.push(`Training today: ${parts.join(" + ")}.`);
  if (plannedToday > today.effective) {
    reasons.push(`Planned today: ${Math.round(plannedToday)} min, so the target already counts it.`);
  }

  if (tierForMinutes(prior.effective) === "heavy" && TIERS.indexOf(tier) < TIERS.indexOf("light")) {
    tier = "light";
    reasons.push("Raised to a light-day target to recover from a heavy day yesterday.");
  }

  const daysToRace = nextRace
    ? Math.round((nextRace.date.getTime() - start.getTime()) / DAY_MS)
    : null;
  if (nextRace && daysToRace === 0) {
    if (TIERS.indexOf(tier) < TIERS.indexOf("heavy")) tier = "heavy";
    reasons.push(`Race day (${nextRace.name}): heavy-day fuelling.`);
  }

  const base = getDailyTargets(tier, latestWeight?.weightKg ?? profile?.weightKg ?? undefined);
  const targets = { calories: base.calories, carbsG: base.carbsG, proteinG: base.proteinG };

  if (nextRace && daysToRace != null && daysToRace >= 1) {
    targets.carbsG = Math.round(targets.carbsG * 1.3);
    targets.calories = Math.round(targets.calories * 1.15);
    reasons.push(
      `Race in ${daysToRace} ${daysToRace === 1 ? "day" : "days"} (${nextRace.name}): carb-loading, about +30% carbs and +15% calories.`
    );
  }

  if (plannedTomorrow >= 90) {
    targets.carbsG = Math.round(targets.carbsG * 1.15);
    targets.calories = Math.round(targets.calories * 1.08);
    reasons.push(
      `Long session tomorrow (${Math.round(plannedTomorrow)} min planned): about +15% carbs and +8% calories tonight.`
    );
  }

  return {
    tier,
    enduranceMin: today.enduranceMin,
    gymMin: today.gymMin,
    targets,
    reasons,
  };
}

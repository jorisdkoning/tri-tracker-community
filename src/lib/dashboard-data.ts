import type { DistanceType, PlannedWorkout } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localToUtc } from "@/lib/ics";
import { DAY_MS, localDateString, localWeekStartDate } from "@/lib/time";
import { computeNutritionPlan, type NutritionPlan } from "@/lib/nutrition-plan";
import { computeGoalProgress, type GoalProgress } from "@/lib/goals";
import { checkInNudge, type CheckInEntry } from "@/lib/checkin";
import { average, computeReadiness, type Readiness } from "@/lib/readiness";
import {
  combineRecent,
  formLabel,
  latestValue,
  summarizeWeek,
  type FormLabel,
  type RecentItem,
  type WeekSummary,
} from "@/lib/dashboard-summary";

export interface DashboardData {
  dateLabel: string;
  today: Date;
  missingSetup: string[];
  fitness: { ctl: number; atl: number; tsb: number; ctlDelta: number | null; form: FormLabel } | null;
  races: { id: string; name: string; date: Date; distanceType: DistanceType }[];
  daysToRace: number | null;
  week: WeekSummary;
  upcoming: PlannedWorkout[];
  recent: RecentItem[];
  recovery: { hrv: number | null; restingHr: number | null; sleepHours: number | null; weightKg: number | null };
  goals: { id: string; label: string; metric: string; targetValue: number; progress: GoalProgress }[];
  fuel: { kcal: number; protein: number; plan: NutritionPlan };
  monthSpend: number;
  checkIn: { today: number | null; recent: CheckInEntry[]; nudge: string | null };
  readiness: Readiness | null;
}

export async function loadDashboardData(userId: string, timeZone: string): Promise<DashboardData> {
  const now = new Date();
  const today = new Date(localDateString(timeZone));
  const weekStartDay = localWeekStartDate(timeZone, now);
  const weekStart = localToUtc(weekStartDay, "00:00", timeZone);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    intervalsAccount,
    stravaAccount,
    fitnessRows,
    weekActivities,
    recentActivities,
    races,
    healthRows,
    todayMeals,
    goals,
    monthExpenses,
    gymThisWeek,
    recentGym,
    nutritionPlan,
    upcoming,
    checkInRows,
  ] = await Promise.all([
    prisma.intervalsAccount.findUnique({ where: { userId }, select: { id: true } }),
    prisma.stravaAccount.findUnique({ where: { userId }, select: { id: true } }),
    prisma.fitnessMetric.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 8 }),
    prisma.activity.findMany({
      where: { userId, startDate: { gte: weekStart } },
      select: { sport: true, movingTime: true, distance: true },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { startDate: "desc" },
      select: { id: true, sport: true, name: true, startDate: true, movingTime: true, distance: true },
      take: 5,
    }),
    prisma.race.findMany({ where: { userId, date: { gte: today } }, orderBy: { date: "asc" }, take: 3 }),
    prisma.dailyMetric.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 30 }),
    prisma.meal.findMany({ where: { userId, date: today } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 3 }),
    prisma.expense.aggregate({ where: { userId, date: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.gymSession.findMany({
      where: { userId, date: { gte: new Date(weekStartDay) } },
      select: { durationSec: true },
    }),
    prisma.gymSession.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      select: { id: true, date: true, notes: true, durationSec: true },
    }),
    computeNutritionPlan(userId, localDateString(timeZone), timeZone),
    prisma.plannedWorkout.findMany({
      where: { userId, date: { gte: today } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
    }),
    prisma.checkIn.findMany({
      where: { userId, date: { gte: new Date(today.getTime() - 6 * DAY_MS) } },
      orderBy: { date: "desc" },
      select: { date: true, feeling: true },
    }),
  ]);

  const checkIns: CheckInEntry[] = checkInRows.map((c) => ({
    date: c.date.toISOString().slice(0, 10),
    feeling: c.feeling,
  }));

  const goalProgress = await Promise.all(goals.map((goal) => computeGoalProgress(userId, goal)));

  const latest = fitnessRows[0];
  const weekAgo = fitnessRows[7];
  const todayFeeling = checkIns.find((c) => c.date === today.toISOString().slice(0, 10))?.feeling ?? null;

  return {
    dateLabel: now.toLocaleDateString("en-GB", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    today,
    missingSetup: [!stravaAccount && "Strava", !intervalsAccount && "intervals.icu"].filter(
      Boolean
    ) as string[],
    fitness: latest
      ? {
          ctl: latest.ctl,
          atl: latest.atl,
          tsb: latest.tsb,
          ctlDelta: weekAgo ? latest.ctl - weekAgo.ctl : null,
          form: formLabel(latest.tsb),
        }
      : null,
    races,
    daysToRace: races[0] ? Math.ceil((races[0].date.getTime() - today.getTime()) / DAY_MS) : null,
    week: summarizeWeek(weekActivities, gymThisWeek),
    upcoming,
    recent: combineRecent(recentActivities, recentGym),
    recovery: {
      hrv: latestValue(healthRows, "hrv"),
      restingHr: latestValue(healthRows, "restingHr"),
      sleepHours: latestValue(healthRows, "sleepHours"),
      weightKg: latestValue(healthRows, "weightKg"),
    },
    goals: goals.map((goal, index) => ({
      id: goal.id,
      label: goal.label,
      metric: goal.metric,
      targetValue: goal.targetValue,
      progress: goalProgress[index],
    })),
    fuel: {
      kcal: todayMeals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0),
      protein: todayMeals.reduce((sum, meal) => sum + (meal.proteinG ?? 0), 0),
      plan: nutritionPlan,
    },
    monthSpend: monthExpenses._sum.amount ?? 0,
    checkIn: {
      today: todayFeeling,
      recent: checkIns,
      nudge: checkInNudge(checkIns),
    },
    readiness: readinessFor(healthRows, latest, todayFeeling, today),
  };
}

type HealthRow = { date: Date; sleepHours: number | null; hrv: number | null; restingHr: number | null };

// Uses last night's numbers (dated today or yesterday) against the person's own
// average of the 4 weeks before.
function readinessFor(
  healthRows: HealthRow[],
  fitness: { date: Date; tsb: number } | undefined,
  feeling: number | null,
  today: Date
): Readiness | null {
  const fresh = (date: Date) => today.getTime() - date.getTime() <= DAY_MS;
  const current = healthRows[0] && fresh(healthRows[0].date) ? healthRows[0] : null;
  const history = healthRows.slice(current ? 1 : 0, 29);
  const baseline = (key: "hrv" | "restingHr") => {
    const values = history.map((r) => r[key]).filter((v): v is number => v != null);
    return values.length >= 5 ? average(values) : null;
  };
  return computeReadiness({
    sleepHours: current?.sleepHours ?? null,
    hrv: current?.hrv ?? null,
    hrvBaseline: baseline("hrv"),
    restingHr: current?.restingHr ?? null,
    restingHrBaseline: baseline("restingHr"),
    tsb: fitness && today.getTime() - fitness.date.getTime() <= 2 * DAY_MS ? fitness.tsb : null,
    feeling,
  });
}

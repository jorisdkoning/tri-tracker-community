import { prisma } from "@/lib/prisma";
import { gettingStartedSteps } from "@/lib/getting-started";

export async function loadGettingStarted(userId: string) {
  const one = { where: { userId }, select: { id: true } } as const;
  const [intervals, strava, metric, activity, gym, checkIn, race, goal, meal] = await Promise.all([
    prisma.intervalsAccount.findFirst(one),
    prisma.stravaAccount.findFirst(one),
    prisma.dailyMetric.findFirst({ where: { userId, source: { not: "manual" } }, select: { id: true } }),
    prisma.activity.findFirst(one),
    prisma.gymSession.findFirst(one),
    prisma.checkIn.findFirst(one),
    prisma.race.findFirst(one),
    prisma.goal.findFirst(one),
    prisma.meal.findFirst(one),
  ]);
  return gettingStartedSteps({
    hasConnection: Boolean(intervals || strava || metric),
    hasWorkout: Boolean(activity || gym),
    hasCheckIn: Boolean(checkIn),
    hasEventOrGoal: Boolean(race || goal),
    hasMeal: Boolean(meal),
  });
}

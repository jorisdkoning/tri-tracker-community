import { prisma } from "@/lib/prisma";
import { localDateString, localWeekStartDate } from "@/lib/time";
import { badges, bestStreak, currentStreak, type Badge } from "@/lib/achievements";

export interface Achievements {
  checkInStreak: number;
  activeWeekStreak: number;
  badges: Badge[];
}

export async function loadAchievements(userId: string, timeZone: string): Promise<Achievements> {
  const [checkIns, activityDates, gymDates, longest, workoutCount, gymCount, mealsLogged] = await Promise.all([
    prisma.checkIn.findMany({ where: { userId }, select: { date: true } }),
    prisma.activity.findMany({ where: { userId }, select: { startDate: true } }),
    prisma.gymSession.findMany({ where: { userId }, select: { date: true } }),
    prisma.activity.groupBy({ by: ["sport"], where: { userId }, _max: { distance: true } }),
    prisma.activity.count({ where: { userId } }),
    prisma.gymSession.count({ where: { userId } }),
    prisma.meal.count({ where: { userId } }),
  ]);

  const today = localDateString(timeZone);
  const checkInDays = new Set(checkIns.map((c) => c.date.toISOString().slice(0, 10)));
  const activeWeeks = new Set([
    ...activityDates.map((a) => localWeekStartDate(timeZone, a.startDate)),
    ...gymDates.map((g) => localWeekStartDate("UTC", g.date)),
  ]);
  const max = (sport: string) => longest.find((l) => l.sport === sport)?._max.distance ?? 0;

  return {
    checkInStreak: currentStreak(checkInDays, today),
    activeWeekStreak: currentStreak(activeWeeks, localWeekStartDate(timeZone), 7),
    badges: badges({
      workouts: workoutCount + gymCount,
      longestRunM: max("RUN"),
      longestRideM: max("BIKE"),
      longestSwimM: max("SWIM"),
      mealsLogged,
      bestCheckInStreak: bestStreak(checkInDays),
      bestActiveWeekStreak: bestStreak(activeWeeks, 7),
    }),
  };
}

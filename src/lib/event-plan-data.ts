import { prisma } from "@/lib/prisma";
import { localToUtc } from "@/lib/ics";
import { DAY_MS, localWeekStartDate } from "@/lib/time";

// Hours trained in each of the last `weeks` completed local weeks, oldest first.
export async function weeklyHours(userId: string, timeZone: string, weeks = 4): Promise<number[]> {
  const thisMonday = new Date(localWeekStartDate(timeZone));
  const mondays = Array.from({ length: weeks + 1 }, (_, i) =>
    new Date(thisMonday.getTime() - (weeks - i) * 7 * DAY_MS).toISOString().slice(0, 10)
  );
  const bounds = mondays.map((day) => localToUtc(day, "00:00", timeZone));
  const [activities, gym] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startDate: { gte: bounds[0], lt: bounds[weeks] } },
      select: { startDate: true, movingTime: true },
    }),
    prisma.gymSession.findMany({
      where: { userId, date: { gte: new Date(mondays[0]), lt: new Date(mondays[weeks]) } },
      select: { date: true, durationSec: true },
    }),
  ]);
  const seconds = Array<number>(weeks).fill(0);
  const add = (at: Date, secs: number) => {
    const index = bounds.findIndex((start, i) => i < weeks && at >= start && at < bounds[i + 1]);
    if (index >= 0) seconds[index] += secs;
  };
  for (const a of activities) add(a.startDate, a.movingTime);
  for (const g of gym) {
    const index = mondays.findIndex((day, i) => i < weeks && g.date >= new Date(day) && g.date < new Date(mondays[i + 1]));
    if (index >= 0) seconds[index] += g.durationSec ?? 0;
  }
  return seconds.map((s) => Math.round((s / 3600) * 10) / 10);
}

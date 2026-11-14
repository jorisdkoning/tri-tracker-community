import { prisma } from "@/lib/prisma";
import { daysAgo, localDateString } from "@/lib/time";
import { cycleStatus, phaseAverages } from "@/lib/cycle";

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Null until the person opts in by logging a period start.
export async function loadCycle(userId: string, timeZone: string) {
  const periods = await prisma.cyclePeriod.findMany({ where: { userId }, orderBy: { startDate: "desc" } });
  if (periods.length === 0) return null;
  const since = daysAgo(365);
  const [checkIns, metrics] = await Promise.all([
    prisma.checkIn.findMany({ where: { userId, date: { gte: since } }, select: { date: true, feeling: true } }),
    prisma.dailyMetric.findMany({ where: { userId, date: { gte: since } }, select: { date: true, hrv: true, sleepHours: true } }),
  ]);
  const starts = periods.map((p) => iso(p.startDate));
  const today = localDateString(timeZone);
  return {
    today,
    periods: periods.slice(0, 6).map((p) => ({ id: p.id, date: iso(p.startDate) })),
    status: cycleStatus(starts, today),
    averages: phaseAverages(starts, [
      ...checkIns.map((c) => ({ date: iso(c.date), feeling: c.feeling })),
      ...metrics.map((m) => ({ date: iso(m.date), hrv: m.hrv, sleepHours: m.sleepHours })),
    ]),
  };
}

export type CycleData = NonNullable<Awaited<ReturnType<typeof loadCycle>>>;

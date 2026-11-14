import { prisma } from "@/lib/prisma";
import {
  classifyWorkout,
  flexNumber,
  parseWorkoutDate,
  type DailyValues,
  type HealthWorkout,
} from "@/lib/health-parse";

export async function saveDailyMetrics(userId: string, perDay: Map<string, DailyValues>) {
  for (const [day, fields] of perDay) {
    await prisma.dailyMetric.upsert({
      where: { userId_date: { userId, date: new Date(day) } },
      update: { ...fields, source: "apple_health" },
      create: { userId, date: new Date(day), ...fields, source: "apple_health" },
    });
  }
}

export async function importWorkouts(userId: string, workouts: HealthWorkout[]) {
  let swimCount = 0;
  let gymCount = 0;
  const skipped: string[] = [];

  for (const workout of workouts) {
    const name = (workout.name ?? "").trim().toLowerCase();
    const start = parseWorkoutDate(workout.start);
    if (!start || !name) continue;

    const durationSec = flexNumber(workout.duration);
    const calories = flexNumber(workout.activeEnergyBurned ?? workout.totalEnergyBurned);
    const kind = classifyWorkout(name);

    if (kind === "swim") {
      const distance = flexNumber(workout.distance) ?? 0;
      const end = parseWorkoutDate(workout.end);
      const movingTime =
        durationSec ?? (end ? Math.round((end.getTime() - start.getTime()) / 1000) : null);
      if (movingTime == null || movingTime <= 0) continue;

      // Store only the fields we actually use, never the raw payload: Health
      // Auto Export can attach GPS routes and minute-by-minute stats that
      // would otherwise burn through Neon's free-tier storage for no benefit.
      const fields = {
        sport: "SWIM" as const,
        name: workout.name ?? "Swim",
        startDate: start,
        movingTime,
        distance,
        kilojoules: calories != null ? calories * 4.184 : null,
        rawJson: {
          source: "apple_health",
          name: workout.name,
          start: workout.start,
          end: workout.end,
          duration: durationSec,
          distance,
          calories,
        },
      };
      const intervalsId = `apple:${start.toISOString()}`;
      await prisma.activity.upsert({
        where: { userId_intervalsId: { userId, intervalsId } },
        update: fields,
        create: { userId, intervalsId, ...fields },
      });
      swimCount++;
      continue;
    }

    if (kind === "strength") {
      const date = new Date(start.toISOString().slice(0, 10));
      const existing = await prisma.gymSession.findFirst({
        where: { userId, date, source: "apple_health" },
        select: { id: true },
      });
      const data = {
        durationSec: durationSec != null ? Math.round(durationSec) : null,
        calories: calories != null ? Math.round(calories) : null,
      };

      if (existing) {
        await prisma.gymSession.update({ where: { id: existing.id }, data });
      } else {
        await prisma.gymSession.create({
          data: { userId, date, sessionType: "OTHER", source: "apple_health", ...data },
        });
      }
      gymCount++;
      continue;
    }

    skipped.push(workout.name ?? name);
  }

  return { swimCount, gymCount, skipped };
}

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const LOG_KINDS = ["RUN", "BIKE", "SWIM", "GYM", "OTHER"] as const;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const optionalNumber = (min: number, max: number, msg: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v === "" || (Number(v) >= min && Number(v) <= max), msg)
    .transform((v) => (v === "" ? null : Number(v)));

export const workoutSchema = z.object({
  kind: z.enum(LOG_KINDS),
  date: day,
  minutes: z.coerce.number().int("Use whole minutes").min(1, "How many minutes did it take?").max(24 * 60),
  distanceKm: optionalNumber(0, 1000, "Distance looks wrong"),
  name: z.string().trim().max(80),
});

export const bodySchema = z
  .object({
    date: day,
    weightKg: optionalNumber(25, 250, "Weight looks wrong"),
    sleepHours: optionalNumber(0, 16, "Sleep should be between 0 and 16 hours"),
    restingHr: optionalNumber(25, 120, "Resting heart rate looks wrong"),
  })
  .refine((v) => v.weightKg != null || v.sleepHours != null || v.restingHr != null, "Fill in at least one number");

const DEFAULT_NAMES: Record<(typeof LOG_KINDS)[number], string> = {
  RUN: "Run",
  BIKE: "Ride",
  SWIM: "Swim",
  GYM: "Gym session",
  OTHER: "Workout",
};

export async function saveManualWorkout(userId: string, input: z.infer<typeof workoutSchema>) {
  const name = input.name || DEFAULT_NAMES[input.kind];
  if (input.kind === "GYM") {
    await prisma.gymSession.create({
      data: { userId, date: new Date(input.date), source: "manual", durationSec: input.minutes * 60, notes: input.name || null },
    });
    return;
  }
  await prisma.activity.create({
    data: {
      userId,
      intervalsId: `manual:${randomUUID()}`,
      sport: input.kind,
      name,
      // Noon UTC keeps the workout on the chosen day in every timezone the app uses.
      startDate: new Date(`${input.date}T12:00:00Z`),
      movingTime: input.minutes * 60,
      distance: (input.distanceKm ?? 0) * 1000,
      rawJson: { source: "manual" },
    },
  });
}

export async function saveManualBody(userId: string, input: z.infer<typeof bodySchema>) {
  const date = new Date(input.date);
  const values = Object.fromEntries(
    Object.entries({ weightKg: input.weightKg, sleepHours: input.sleepHours, restingHr: input.restingHr }).filter(
      ([, v]) => v != null
    )
  );
  await prisma.dailyMetric.upsert({
    where: { userId_date: { userId, date } },
    update: values,
    create: { userId, date, source: "manual", ...values },
  });
}

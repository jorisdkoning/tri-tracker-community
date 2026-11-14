"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { requireUserId } from "@/lib/session";
const raceSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  distanceType: z.enum([
    "SPRINT",
    "OLYMPIC",
    "HALF_IRONMAN",
    "IRONMAN",
    "OTHER",
  ]),
  goal: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function addRace(formData: FormData) {
  const userId = await requireUserId();

  const parsed = raceSchema.parse({
    name: formData.get("name"),
    date: formData.get("date"),
    distanceType: formData.get("distanceType"),
    goal: formData.get("goal") || undefined,
    notes: formData.get("notes") || undefined,
  });

  await prisma.race.create({
    data: {
      userId,
      name: parsed.name,
      date: new Date(parsed.date),
      distanceType: parsed.distanceType,
      goal: parsed.goal ?? null,
      notes: parsed.notes ?? null,
    },
  });

  revalidatePath("/races");
  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteRace(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing race id");

  // Scope the delete to the current user so an id can't delete others' rows
  await prisma.race.deleteMany({ where: { id, userId } });

  revalidatePath("/races");
  revalidatePath("/budget");
  revalidatePath("/");
}

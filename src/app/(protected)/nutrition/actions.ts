"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { requireUserId } from "@/lib/session";
const mealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  mealType: z.enum([
    "BREAKFAST",
    "PRE_TRAINING",
    "ON_BIKE",
    "LUNCH",
    "DINNER",
    "SNACK",
  ]),
  safeFoodId: z.string().trim().optional(),
  description: z.string().trim().max(200).optional(),
  calories: z.coerce.number().int().positive().optional(),
  proteinG: z.coerce.number().int().min(0).optional(),
});

export async function addMeal(formData: FormData) {
  const userId = await requireUserId();

  const parsed = mealSchema.parse({
    date: formData.get("date"),
    mealType: formData.get("mealType"),
    safeFoodId: formData.get("safeFoodId") || undefined,
    description: formData.get("description") || undefined,
    calories: formData.get("calories") || undefined,
    proteinG: formData.get("proteinG") || undefined,
  });

  let description = parsed.description;
  let calories = parsed.calories ?? null;
  let proteinG = parsed.proteinG ?? null;
  let fodmapRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let safeFoodId: string | null = null;

  if (parsed.safeFoodId) {
    const food = await prisma.safeFood.findFirst({
      where: { id: parsed.safeFoodId, userId },
    });
    if (food) {
      safeFoodId = food.id;
      description = description || food.name;
      calories = calories ?? food.calories;
      proteinG = proteinG ?? food.proteinG;
      fodmapRisk = food.fodmapRisk;
    }
  }

  if (!description) throw new Error("A description or saved food is required");

  await prisma.meal.create({
    data: {
      userId,
      date: new Date(parsed.date),
      mealType: parsed.mealType,
      description,
      calories,
      proteinG,
      fodmapRisk,
      safeFoodId,
    },
  });

  revalidatePath("/nutrition");
}

export async function deleteMeal(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing meal id");

  await prisma.meal.deleteMany({ where: { id, userId } });

  revalidatePath("/nutrition");
}

const safeFoodSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  calories: z.coerce.number().int().positive().optional(),
  proteinG: z.coerce.number().int().min(0).optional(),
  carbsG: z.coerce.number().int().min(0).optional(),
  fodmapRisk: z.enum(["LOW", "MEDIUM", "HIGH"]),
  containsLactose: z.coerce.boolean().optional(),
  containsGluten: z.coerce.boolean().optional(),
  containsOnion: z.coerce.boolean().optional(),
  isRideFood: z.coerce.boolean().optional(),
});

export async function addSafeFood(formData: FormData) {
  const userId = await requireUserId();

  const parsed = safeFoodSchema.parse({
    name: formData.get("name"),
    calories: formData.get("calories") || undefined,
    proteinG: formData.get("proteinG") || undefined,
    carbsG: formData.get("carbsG") || undefined,
    fodmapRisk: formData.get("fodmapRisk") || "LOW",
    containsLactose: formData.get("containsLactose") === "on",
    containsGluten: formData.get("containsGluten") === "on",
    containsOnion: formData.get("containsOnion") === "on",
    isRideFood: formData.get("isRideFood") === "on",
  });

  await prisma.safeFood.create({
    data: {
      userId,
      name: parsed.name,
      calories: parsed.calories ?? null,
      proteinG: parsed.proteinG ?? null,
      carbsG: parsed.carbsG ?? null,
      fodmapRisk: parsed.fodmapRisk,
      containsLactose: parsed.containsLactose ?? false,
      containsGluten: parsed.containsGluten ?? false,
      containsOnion: parsed.containsOnion ?? false,
      isRideFood: parsed.isRideFood ?? false,
    },
  });

  revalidatePath("/nutrition");
}

export async function deleteSafeFood(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing safe food id");

  await prisma.safeFood.deleteMany({ where: { id, userId } });

  revalidatePath("/nutrition");
}

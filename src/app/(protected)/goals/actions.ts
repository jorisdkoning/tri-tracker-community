"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { requireUserId } from "@/lib/session";
const goalSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(120),
  metric: z.enum([
    "CYCLING_SPEED_KMH",
    "SWIM_PACE_SEC_PER_100M",
    "RUN_PACE_SEC_PER_KM",
    "WEIGHT_KG",
    "CUSTOM",
  ]),
  targetValue: z.coerce.number(),
  direction: z.enum(["INCREASE", "DECREASE"]),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

export async function addGoal(formData: FormData) {
  const userId = await requireUserId();

  const parsed = goalSchema.parse({
    label: formData.get("label"),
    metric: formData.get("metric"),
    targetValue: formData.get("targetValue"),
    direction: formData.get("direction"),
    deadline: formData.get("deadline") || undefined,
    notes: formData.get("notes") || undefined,
  });

  await prisma.goal.create({
    data: {
      userId,
      label: parsed.label,
      metric: parsed.metric,
      targetValue: parsed.targetValue,
      direction: parsed.direction,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      notes: parsed.notes ?? null,
    },
  });

  revalidatePath("/goals");
  revalidatePath("/");
}

export async function deleteGoal(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing goal id");

  await prisma.goal.deleteMany({ where: { id, userId } });

  revalidatePath("/goals");
  revalidatePath("/");
}

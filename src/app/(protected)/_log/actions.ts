"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { bodySchema, saveManualBody, saveManualWorkout, workoutSchema } from "@/lib/manual-log";

export type LogState = { error?: string; saved?: number } | undefined;

export async function logWorkoutAction(_prev: LogState, formData: FormData): Promise<LogState> {
  const userId = await requireUserId();
  const parsed = workoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  await saveManualWorkout(userId, parsed.data);
  for (const path of ["/", "/training", "/gym"]) revalidatePath(path);
  return { saved: Date.now() };
}

export async function logBodyAction(_prev: LogState, formData: FormData): Promise<LogState> {
  const userId = await requireUserId();
  const parsed = bodySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  await saveManualBody(userId, parsed.data);
  for (const path of ["/", "/health"]) revalidatePath(path);
  return { saved: Date.now() };
}

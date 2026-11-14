"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { IntervalsApiError, fetchAthleteProfile } from "@/lib/intervals";
import { runIntervalsSync, runStravaSync } from "@/lib/sync";

import { requireUserId } from "@/lib/session";
export async function connectIntervals(formData: FormData) {
  const userId = await requireUserId();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) throw new Error("API key is required");

  let athleteId: string | undefined;
  try {
    const profile = await fetchAthleteProfile(apiKey);
    athleteId = profile.id;
  } catch (error) {
    if (error instanceof IntervalsApiError && error.status === 401) {
      throw new Error("intervals.icu rejected that API key");
    }
    throw error;
  }

  await prisma.intervalsAccount.upsert({
    where: { userId },
    update: { apiKey: encrypt(apiKey), athleteId },
    create: { userId, apiKey: encrypt(apiKey), athleteId },
  });

  revalidatePath("/settings");
}

export async function disconnectIntervals() {
  const userId = await requireUserId();
  await prisma.intervalsAccount.deleteMany({ where: { userId } });
  revalidatePath("/settings");
}

export async function syncIntervals() {
  const userId = await requireUserId();
  const result = await runIntervalsSync(userId);

  revalidatePath("/settings");
  revalidatePath("/training");
  revalidatePath("/health");
  revalidatePath("/");

  return result;
}

export type SyncActionState =
  | { status: "idle" }
  | { status: "success"; activities: number; wellnessDays: number }
  | { status: "error"; message: string };

export async function syncIntervalsAction(
  _prevState: SyncActionState
): Promise<SyncActionState> {
  try {
    const result = await syncIntervals();
    return { status: "success", ...result };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

// --- Strava (direct connection for activity details) ---

export async function disconnectStrava() {
  const userId = await requireUserId();
  await prisma.stravaAccount.deleteMany({ where: { userId } });
  revalidatePath("/settings");
}

export async function syncStrava() {
  const userId = await requireUserId();
  const result = await runStravaSync(userId);

  revalidatePath("/settings");
  revalidatePath("/training");
  revalidatePath("/");

  return result;
}

export type StravaSyncActionState =
  | { status: "idle" }
  | { status: "success"; activities: number }
  | { status: "error"; message: string };

export async function syncStravaAction(
  _prevState: StravaSyncActionState
): Promise<StravaSyncActionState> {
  try {
    const result = await syncStrava();
    return { status: "success", ...result };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Sync failed",
    };
  }
}

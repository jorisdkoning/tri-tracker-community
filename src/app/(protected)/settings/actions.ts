"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { IntervalsApiError, fetchAthleteProfile } from "@/lib/intervals";
import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { runIntervalsSync, runStravaSync } from "@/lib/sync";
import { requireUserId } from "@/lib/session";
import { parseProfileForm } from "@/lib/profile";
import { rotateLinkToken } from "@/lib/tokens";
import { MIN_PASSWORD_LENGTH } from "@/lib/signup-rules";
export async function connectIntervalsAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await requireUserId();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: "Paste your API key first" };

  let athleteId: string | undefined;
  try {
    const profile = await fetchAthleteProfile(apiKey);
    athleteId = profile.id;
  } catch (error) {
    if (error instanceof IntervalsApiError && (error.status === 401 || error.status === 403)) {
      return { error: "Intervals.icu did not accept that key. Copy it again and make sure nothing is missing." };
    }
    return { error: "Could not reach Intervals.icu. Try again in a minute." };
  }

  await prisma.intervalsAccount.upsert({
    where: { userId },
    update: { apiKey: encrypt(apiKey), athleteId },
    create: { userId, apiKey: encrypt(apiKey), athleteId },
  });

  revalidatePath("/settings");
  return { saved: true };
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

// --- Profile, personal links and account ---

export type ProfileState = { error?: string; saved?: boolean } | undefined;

export async function saveProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await requireUserId();
  const parsed = parseProfileForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form" };
  await prisma.user.update({ where: { id: userId }, data: parsed.data });
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function rotateLinkAction(formData: FormData) {
  const userId = await requireUserId();
  const kind = String(formData.get("kind"));
  if (kind !== "HEALTH" && kind !== "CALENDAR" && kind !== "CLAUDE") throw new Error("Unknown link");
  await rotateLinkToken(userId, kind);
  revalidatePath("/settings");
}

export async function changePasswordAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await requireUserId();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password` };
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (user.passwordHash && !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Your current password is not right" };
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { saved: true };
}

export async function deleteAccountAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await requireUserId();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (String(formData.get("confirmEmail") ?? "").trim().toLowerCase() !== user.email) {
    return { error: "Type your email address exactly to confirm" };
  }
  // Every table hangs off User with onDelete: Cascade, so this removes all data.
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/login?error=AccountGone" });
}

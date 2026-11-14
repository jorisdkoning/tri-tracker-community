"use server";

import { redirect } from "next/navigation";
import type { DistanceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { parseProfileForm } from "@/lib/profile";

const DISTANCES: DistanceType[] = ["SPRINT", "OLYMPIC", "HALF_IRONMAN", "IRONMAN", "OTHER"];

export type WelcomeState = { error?: string } | undefined;

export async function finishWelcomeAction(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const userId = await requireUserId();
  const profile = parseProfileForm(formData);
  if (!profile.success) return { error: profile.error.issues[0]?.message ?? "Please check the form" };

  const raceName = String(formData.get("raceName") ?? "").trim().slice(0, 120);
  const raceDate = String(formData.get("raceDate") ?? "");
  const distance = String(formData.get("raceDistance") ?? "OTHER") as DistanceType;
  if (raceName && !/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) {
    return { error: "Please pick the date of your race (or leave the race name empty)" };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { ...profile.data, onboardedAt: new Date() } }),
    ...(raceName
      ? [
          prisma.race.create({
            data: {
              userId,
              name: raceName,
              date: new Date(raceDate),
              distanceType: DISTANCES.includes(distance) ? distance : "OTHER",
            },
          }),
        ]
      : []),
  ]);
  redirect("/settings?welcome=1");
}

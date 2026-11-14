"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { localDateString } from "@/lib/time";

const schema = z.object({
  feeling: z.number().int().min(1).max(5),
  note: z.string().trim().max(200).optional(),
});

// One check-in per day: answering again today replaces the earlier answer.
export async function saveCheckIn(feeling: number, note?: string) {
  const { id: userId, timezone } = await requireUser();
  const parsed = schema.parse({ feeling, note });
  const date = new Date(localDateString(timezone));

  await prisma.checkIn.upsert({
    where: { userId_date: { userId, date } },
    update: { feeling: parsed.feeling, note: parsed.note || null },
    create: { userId, date, feeling: parsed.feeling, note: parsed.note || null },
  });

  revalidatePath("/");
}

const HIDE_GETTING_STARTED_COOKIE = "hide_getting_started";

export async function hideGettingStarted() {
  await requireUser();
  (await cookies()).set(HIDE_GETTING_STARTED_COOKIE, "1", { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  revalidatePath("/");
}

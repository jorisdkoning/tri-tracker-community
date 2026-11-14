"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { localDateString } from "@/lib/time";

const schema = z.object({
  feeling: z.number().int().min(1).max(5),
  note: z.string().trim().max(200).optional(),
});

// One check-in per day: answering again today replaces the earlier answer.
export async function saveCheckIn(feeling: number, note?: string) {
  const userId = await requireUserId();
  const parsed = schema.parse({ feeling, note });
  const date = new Date(localDateString());

  await prisma.checkIn.upsert({
    where: { userId_date: { userId, date } },
    update: { feeling: parsed.feeling, note: parsed.note || null },
    create: { userId, date, feeling: parsed.feeling, note: parsed.note || null },
  });

  revalidatePath("/");
}

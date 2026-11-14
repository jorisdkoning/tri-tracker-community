"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { localDateString } from "@/lib/time";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function logPeriodStart(formData: FormData) {
  const user = await requireUser();
  const parsed = dateSchema.safeParse(formData.get("date"));
  if (!parsed.success) return;
  const today = localDateString(user.timezone);
  const twoYearsAgo = `${Number(today.slice(0, 4)) - 2}${today.slice(4)}`;
  if (parsed.data > today || parsed.data < twoYearsAgo) return;
  const startDate = new Date(parsed.data);
  await prisma.cyclePeriod.upsert({
    where: { userId_startDate: { userId: user.id, startDate } },
    create: { userId: user.id, startDate },
    update: {},
  });
  revalidatePath("/health");
}

export async function deletePeriodStart(formData: FormData) {
  const user = await requireUser();
  await prisma.cyclePeriod.deleteMany({ where: { id: String(formData.get("id") ?? ""), userId: user.id } });
  revalidatePath("/health");
}

export async function stopCycleTracking() {
  const user = await requireUser();
  await prisma.cyclePeriod.deleteMany({ where: { userId: user.id } });
  revalidatePath("/health");
}

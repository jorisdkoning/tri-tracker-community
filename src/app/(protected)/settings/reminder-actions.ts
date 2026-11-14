"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sendPushToUser } from "@/lib/push";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isAllowedPushEndpoint),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { endpoint, keys } = parsed.data;
  // A device belongs to whoever subscribed it last (e.g. a shared family iPad).
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function removePushSubscription(endpoint: string) {
  const userId = await requireUserId();
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  revalidatePath("/settings");
}

export async function setReminderPrefs(prefs: { remindCheckIn: boolean; remindWeekly: boolean }) {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { remindCheckIn: Boolean(prefs.remindCheckIn), remindWeekly: Boolean(prefs.remindWeekly) },
  });
  revalidatePath("/settings");
}

export async function sendTestReminder(): Promise<{ sent: number }> {
  const userId = await requireUserId();
  const sent = await sendPushToUser(userId, {
    title: "Reminders work!",
    body: "This is how FitLog will remind you.",
    url: "/settings#reminders",
  });
  return { sent };
}

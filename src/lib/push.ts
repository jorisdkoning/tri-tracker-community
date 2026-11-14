import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

let configured = false;
export function pushConfigured(): boolean {
  const publicKey = vapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
    configured = true;
  }
  return true;
}

// Sends to every device of the person; devices that unsubscribed are removed.
export async function sendPushToUser(userId: string, message: PushMessage): Promise<number> {
  if (!pushConfigured()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message),
        { TTL: 60 * 60 * 12 }
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error("[push] send failed", status ?? (error instanceof Error ? error.message : error));
      }
    }
  }
  return sent;
}

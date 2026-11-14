import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export type CoachKey = { apiKey: string; ownKey: boolean };

// The user's own Claude key comes first; the host's ANTHROPIC_API_KEY, if set,
// is the fallback (and only then does the daily spending cap apply).
export async function getCoachKey(userId: string): Promise<CoachKey | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { anthropicApiKey: true },
  });
  if (user?.anthropicApiKey) return { apiKey: decrypt(user.anthropicApiKey), ownKey: true };
  const hostKey = process.env.ANTHROPIC_API_KEY;
  return hostKey ? { apiKey: hostKey, ownKey: false } : null;
}

export function coachErrorMessage(error: unknown): string {
  const status = (error as { status?: number })?.status;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (status === 401 || status === 403) {
    return "Your Claude key no longer works. Add a new one in Settings.";
  }
  if (message.includes("credit balance")) {
    return "Your Anthropic account is out of credit. Add some at console.anthropic.com/settings/billing.";
  }
  if (status === 429) return "Claude is busy or your Anthropic limit was reached. Try again in a minute.";
  return "The coach couldn't answer right now. Try again in a minute.";
}

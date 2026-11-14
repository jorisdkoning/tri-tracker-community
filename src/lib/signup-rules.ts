import type { SignupMode } from "@prisma/client";
import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("That doesn't look like an email address").max(200),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters for your password`)
    .max(200),
});

export interface InviteState {
  usedAt: Date | null;
  expiresAt: Date;
}

// Whether a brand-new account may be created. The very first account on a
// deployment is always allowed (it becomes the admin), whatever the mode.
export function signupDecision(
  mode: SignupMode,
  userCount: number,
  invite: InviteState | null,
  now: Date = new Date()
): { ok: true } | { ok: false; reason: string } {
  if (userCount === 0) return { ok: true };
  if (mode === "OPEN") return { ok: true };
  if (mode === "CLOSED") {
    return { ok: false, reason: "Sign-ups are closed on this app. Ask the person who runs it." };
  }
  if (!invite) {
    return { ok: false, reason: "You need an invite link to join. Ask the person who runs this app." };
  }
  if (invite.usedAt) return { ok: false, reason: "This invite link has already been used." };
  if (invite.expiresAt <= now) return { ok: false, reason: "This invite link has expired." };
  return { ok: true };
}

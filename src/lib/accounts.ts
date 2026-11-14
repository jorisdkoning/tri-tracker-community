import bcrypt from "bcryptjs";
import type { SignupMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signupDecision } from "@/lib/signup-rules";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/time";

export async function getSignupMode(): Promise<SignupMode> {
  const row = await prisma.appSetting.findUnique({ where: { id: 1 } });
  return row?.signupMode ?? "OPEN";
}

export async function setSignupMode(signupMode: SignupMode) {
  await prisma.appSetting.upsert({
    where: { id: 1 },
    update: { signupMode },
    create: { id: 1, signupMode },
  });
}

export async function checkCanSignUp(inviteCode: string | null | undefined) {
  const [mode, userCount, invite] = await Promise.all([
    getSignupMode(),
    prisma.user.count(),
    inviteCode ? prisma.invite.findUnique({ where: { code: inviteCode } }) : null,
  ]);
  const decision = signupDecision(mode, userCount, invite);
  return decision.ok ? { ok: true as const, inviteRequired: mode === "INVITE" && userCount > 0 } : decision;
}

// Atomically marks an invite used, so two people can't both join on one link.
export async function claimInvite(code: string | null | undefined, email: string): Promise<boolean> {
  if (!code) return false;
  const claimed = await prisma.invite.updateMany({
    where: { code, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date(), usedByEmail: email },
  });
  return claimed.count === 1;
}

// Runs for every newly created user (password or Google): the very first
// account on a deployment becomes admin.
export async function finishNewAccount(userId: string) {
  const otherUsers = await prisma.user.count({ where: { NOT: { id: userId } } });
  if (otherUsers === 0) {
    await prisma.user.update({ where: { id: userId }, data: { isAdmin: true } });
  }
}

export async function createPasswordAccount(input: {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  inviteCode?: string | null;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const decision = await checkCanSignUp(input.inviteCode);
  if (!decision.ok) return decision;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { ok: false, reason: "There is already an account with this email. Try signing in instead." };
  }
  if (decision.inviteRequired && !(await claimInvite(input.inviteCode, input.email))) {
    return { ok: false, reason: "This invite link has already been used." };
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      timezone: input.timezone && isValidTimezone(input.timezone) ? input.timezone : DEFAULT_TIMEZONE,
    },
  });
  await finishNewAccount(user.id);
  return { ok: true };
}

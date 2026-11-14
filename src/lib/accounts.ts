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
  return signupDecision(mode, userCount, invite);
}

// Runs for every newly created user (password or Google): the first account
// becomes admin, and the invite it came with is marked used.
export async function finishNewAccount(userId: string, email: string, inviteCode?: string | null) {
  const otherAdmins = await prisma.user.count({ where: { isAdmin: true, NOT: { id: userId } } });
  if (otherAdmins === 0) {
    await prisma.user.update({ where: { id: userId }, data: { isAdmin: true } });
  }
  if (inviteCode) {
    await prisma.invite.updateMany({
      where: { code: inviteCode, usedAt: null },
      data: { usedAt: new Date(), usedByEmail: email },
    });
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

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      timezone: input.timezone && isValidTimezone(input.timezone) ? input.timezone : DEFAULT_TIMEZONE,
    },
  });
  await finishNewAccount(user.id, user.email, input.inviteCode);
  return { ok: true };
}

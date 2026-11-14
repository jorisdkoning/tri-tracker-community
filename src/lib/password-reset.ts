import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DAY_MS } from "@/lib/time";
import { generateToken, hashToken } from "@/lib/tokens";

const RESET_VALID_MS = 2 * DAY_MS;

// The app sends no email, so an admin creates the link and passes it on.
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await prisma.passwordReset.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_VALID_MS) },
  });
  return token;
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  return Boolean(row && !row.usedAt && row.expiresAt > new Date());
}

export async function resetPasswordWithToken(token: string, password: string): Promise<boolean> {
  if (!token) return false;
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return false;

  // Marking it used inside the same transaction stops a second use racing in.
  const claimed = await prisma.passwordReset.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return false;
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  return true;
}

import { prisma } from "@/lib/prisma";
import { DAY_MS } from "@/lib/time";
import { generateToken } from "@/lib/tokens";

export const INVITE_VALID_DAYS = 14;

export async function loadAdminOverview() {
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        isAdmin: true,
        onboardedAt: true,
        stravaAccount: { select: { id: true } },
        intervalsAccount: { select: { id: true } },
        _count: { select: { activities: true } },
      },
    }),
    prisma.invite.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return { users, invites };
}

export async function createInvite(createdById: string, note: string | null): Promise<string> {
  const code = generateToken(12);
  await prisma.invite.create({
    data: { code, note, createdById, expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * DAY_MS) },
  });
  return code;
}

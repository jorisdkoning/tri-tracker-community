import { prisma } from "@/lib/prisma";
import { DAY_MS } from "@/lib/time";
import { generateToken } from "@/lib/tokens";
import { adminUserStatus } from "@/lib/admin-stats";

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
        stravaAccount: { select: { lastSyncAt: true } },
        intervalsAccount: { select: { lastSyncAt: true } },
        _count: { select: { activities: true } },
        activities: { orderBy: { startDate: "desc" }, take: 1, select: { startDate: true } },
        dailyMetrics: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        checkIns: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        meals: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.invite.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const now = new Date();
  const withStatus = users.map((u) => {
    const syncs = [u.intervalsAccount?.lastSyncAt, u.stravaAccount?.lastSyncAt].filter(
      (d): d is Date => d instanceof Date
    );
    return {
      ...u,
      status: adminUserStatus(
        {
          connected: Boolean(u.intervalsAccount || u.stravaAccount),
          lastSyncAt: syncs.length > 0 ? new Date(Math.max(...syncs.map((d) => d.getTime()))) : null,
          latestData: [
            u.activities[0]?.startDate,
            u.dailyMetrics[0]?.date,
            u.checkIns[0]?.date,
            u.meals[0]?.createdAt,
          ],
        },
        now
      ),
    };
  });
  return { users: withStatus, invites };
}

export async function createInvite(createdById: string, note: string | null): Promise<string> {
  const code = generateToken(12);
  await prisma.invite.create({
    data: { code, note, createdById, expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * DAY_MS) },
  });
  return code;
}

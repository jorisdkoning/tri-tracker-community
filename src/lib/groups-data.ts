import type { ChallengeMetric } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localToUtc } from "@/lib/ics";
import { periodStartDate, rankLeaderboard, type Period } from "@/lib/groups";

export async function listMyGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: { group: { select: { id: true, name: true, metric: true, _count: { select: { members: true } } } } },
  });
  return memberships.map((m) => m.group);
}

// Null unless userId is a member: non-members never see a group.
export async function loadGroupForMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          metric: true,
          joinCode: true,
          createdById: true,
          members: { select: { userId: true, displayName: true } },
        },
      },
    },
  });
  return membership?.group ?? null;
}

type Member = { userId: string; displayName: string };

// Only the one total per member for the challenge leaves this function.
export async function loadLeaderboard(
  members: Member[],
  metric: ChallengeMetric,
  timeZone: string,
  period: Period
) {
  const userIds = members.map((m) => m.userId);
  const startDate = periodStartDate(timeZone, period);
  const since = localToUtc(startDate, "00:00", timeZone);
  const totals = new Map<string, number>();
  const add = (userId: string, value: number | null | undefined) =>
    totals.set(userId, (totals.get(userId) ?? 0) + (value ?? 0));

  if (metric === "CHECKINS") {
    const rows = await prisma.checkIn.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, date: { gte: new Date(startDate) } },
      _count: { _all: true },
    });
    for (const r of rows) add(r.userId, r._count._all);
  } else {
    const [activities, gym] = await Promise.all([
      prisma.activity.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, startDate: { gte: since } },
        _sum: { movingTime: true, distance: true },
        _count: { _all: true },
      }),
      metric === "DISTANCE"
        ? []
        : prisma.gymSession.groupBy({
            by: ["userId"],
            where: { userId: { in: userIds }, date: { gte: new Date(startDate) } },
            _sum: { durationSec: true },
            _count: { _all: true },
          }),
    ]);
    for (const r of activities) {
      add(r.userId, metric === "ACTIVE_MINUTES" ? r._sum.movingTime : metric === "DISTANCE" ? r._sum.distance : r._count._all);
    }
    for (const r of gym) add(r.userId, metric === "ACTIVE_MINUTES" ? r._sum.durationSec : r._count._all);
  }

  return rankLeaderboard(members.map((m) => ({ ...m, value: Math.round(totals.get(m.userId) ?? 0) })));
}

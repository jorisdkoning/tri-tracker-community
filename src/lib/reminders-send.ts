import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { remindersFor } from "@/lib/reminders";
import { localToUtc } from "@/lib/ics";
import { DAY_MS, localDateString, localWeekStartDate } from "@/lib/time";

export async function sendDueReminders(now: Date = new Date()) {
  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} }, OR: [{ remindCheckIn: true }, { remindWeekly: true }] },
    select: { id: true, timezone: true, remindCheckIn: true, remindWeekly: true },
  });
  let sent = 0;
  for (const user of users) {
    const today = localDateString(user.timezone, now);
    const isMonday = new Date(today).getUTCDay() === 1;
    const [checkIn, lastWeek] = await Promise.all([
      prisma.checkIn.findFirst({ where: { userId: user.id, date: new Date(today) }, select: { id: true } }),
      isMonday
        ? prisma.activity.aggregate({
            where: { userId: user.id, startDate: previousLocalWeek(user.timezone, now) },
            _count: true,
            _sum: { movingTime: true },
          })
        : null,
    ]);
    const messages = remindersFor({
      remindCheckIn: user.remindCheckIn,
      remindWeekly: user.remindWeekly,
      checkedInToday: Boolean(checkIn),
      isMonday,
      lastWeek: { workouts: lastWeek?._count ?? 0, seconds: lastWeek?._sum.movingTime ?? 0 },
    });
    for (const message of messages) sent += await sendPushToUser(user.id, message);
  }
  return { users: users.length, sent };
}

// Monday 00:00 to Monday 00:00 of last week, in the person's own timezone.
function previousLocalWeek(timeZone: string, now: Date) {
  const thisMonday = localWeekStartDate(timeZone, now);
  const lastMonday = new Date(new Date(thisMonday).getTime() - 7 * DAY_MS).toISOString().slice(0, 10);
  return { gte: localToUtc(lastMonday, "00:00", timeZone), lt: localToUtc(thisMonday, "00:00", timeZone) };
}

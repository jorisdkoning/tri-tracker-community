import { formatDuration } from "@/lib/format";
import { localToUtc } from "@/lib/ics";
import { DAY_MS, localWeekStartDate } from "@/lib/time";
import type { PushMessage } from "@/lib/push";

export interface ReminderInput {
  remindCheckIn: boolean;
  remindWeekly: boolean;
  checkedInToday: boolean;
  isMonday: boolean;
  lastWeek: { workouts: number; seconds: number };
}

export function remindersFor(input: ReminderInput): PushMessage[] {
  const messages: PushMessage[] = [];
  if (input.remindWeekly && input.isMonday) {
    const { workouts, seconds } = input.lastWeek;
    messages.push({
      title: "Your week in FitLog",
      body:
        workouts > 0
          ? `Last week: ${workouts} workout${workouts === 1 ? "" : "s"}, ${formatDuration(seconds)} in total. Have a good week!`
          : "A fresh week! Even one short walk counts.",
      url: "/training",
    });
  }
  if (input.remindCheckIn && !input.checkedInToday) {
    messages.push({ title: "How do you feel today?", body: "One tap to check in.", url: "/#check-in" });
  }
  return messages;
}

// Monday 00:00 to Monday 00:00 of last week, in the person's own timezone.
export function previousLocalWeek(timeZone: string, now: Date) {
  const thisMonday = localWeekStartDate(timeZone, now);
  const lastMonday = new Date(new Date(thisMonday).getTime() - 7 * DAY_MS).toISOString().slice(0, 10);
  return { gte: localToUtc(lastMonday, "00:00", timeZone), lt: localToUtc(thisMonday, "00:00", timeZone) };
}

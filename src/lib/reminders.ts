import { formatDuration } from "@/lib/format";
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

// Streaks and badges. Pure, no database access; dates are local YYYY-MM-DD.
import { DAY_MS } from "@/lib/time";

const shift = (day: string, days: number) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

// Consecutive steps ending today, or ending at the previous step if today is
// still open (so a streak doesn't look broken in the morning).
export function currentStreak(done: Set<string>, today: string, stepDays = 1): number {
  let day = done.has(today) ? today : shift(today, -stepDays);
  let count = 0;
  while (done.has(day)) {
    count++;
    day = shift(day, -stepDays);
  }
  return count;
}

export function bestStreak(done: Set<string>, stepDays = 1): number {
  let best = 0;
  for (const day of done) {
    if (done.has(shift(day, -stepDays))) continue;
    let length = 0;
    let next = day;
    while (done.has(next)) {
      length++;
      next = shift(next, stepDays);
    }
    best = Math.max(best, length);
  }
  return best;
}

export interface AchievementStats {
  workouts: number;
  longestRunM: number;
  longestRideM: number;
  longestSwimM: number;
  mealsLogged: number;
  bestCheckInStreak: number;
  bestActiveWeekStreak: number;
}

export interface Badge {
  id: string;
  label: string;
  hint: string;
  earned: boolean;
}

export function badges(s: AchievementStats): Badge[] {
  const list: [string, string, string, boolean][] = [
    ["first-workout", "First workout", "Log or sync your first workout", s.workouts >= 1],
    ["workouts-10", "10 workouts", "Do 10 workouts", s.workouts >= 10],
    ["workouts-50", "50 workouts", "Do 50 workouts", s.workouts >= 50],
    ["workouts-100", "100 workouts", "Do 100 workouts", s.workouts >= 100],
    ["run-5k", "First 5 km run", "Run 5 km in one go", s.longestRunM >= 5000],
    ["run-10k", "First 10 km run", "Run 10 km in one go", s.longestRunM >= 10000],
    ["run-half", "Half marathon", "Run 21.1 km in one go", s.longestRunM >= 21097],
    ["run-marathon", "Marathon", "Run 42.2 km in one go", s.longestRunM >= 42195],
    ["ride-50k", "50 km ride", "Cycle 50 km in one go", s.longestRideM >= 50000],
    ["ride-100k", "100 km ride", "Cycle 100 km in one go", s.longestRideM >= 100000],
    ["swim-1k", "1 km swim", "Swim 1 km in one go", s.longestSwimM >= 1000],
    ["checkin-7", "7-day check-in streak", "Check in 7 days in a row", s.bestCheckInStreak >= 7],
    ["checkin-30", "30-day check-in streak", "Check in 30 days in a row", s.bestCheckInStreak >= 30],
    ["weeks-4", "4 active weeks", "Work out at least once a week, 4 weeks in a row", s.bestActiveWeekStreak >= 4],
    ["weeks-12", "12 active weeks", "Work out at least once a week, 12 weeks in a row", s.bestActiveWeekStreak >= 12],
    ["first-meal", "Food logger", "Log your first meal", s.mealsLogged >= 1],
  ];
  return list.map(([id, label, hint, earned]) => ({ id, label, hint, earned }));
}

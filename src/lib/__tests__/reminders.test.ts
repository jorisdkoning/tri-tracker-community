import { describe, expect, it } from "vitest";
import { remindersFor } from "../reminders";

const base = {
  remindCheckIn: true,
  remindWeekly: true,
  checkedInToday: false,
  isMonday: false,
  lastWeek: { workouts: 0, seconds: 0 },
};

describe("remindersFor", () => {
  it("reminds to check in only when not done yet", () => {
    expect(remindersFor(base).map((m) => m.url)).toEqual(["/#check-in"]);
    expect(remindersFor({ ...base, checkedInToday: true })).toEqual([]);
  });

  it("sends the weekly summary on Mondays", () => {
    const [weekly] = remindersFor({ ...base, checkedInToday: true, isMonday: true, lastWeek: { workouts: 3, seconds: 9000 } });
    expect(weekly.body).toContain("3 workouts");
  });

  it("respects switched-off reminders", () => {
    expect(remindersFor({ ...base, isMonday: true, remindCheckIn: false, remindWeekly: false })).toEqual([]);
  });
});

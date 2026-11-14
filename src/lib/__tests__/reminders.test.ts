import { describe, expect, it } from "vitest";
import { previousLocalWeek, remindersFor } from "../reminders";

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

describe("previousLocalWeek", () => {
  it("spans last local Monday to this local Monday", () => {
    // Monday 17:00 UTC = Monday 18:00 in Amsterdam (winter time).
    const week = previousLocalWeek("Europe/Amsterdam", new Date("2026-11-16T17:00:00Z"));
    expect(week.gte.toISOString()).toBe("2026-11-08T23:00:00.000Z");
    expect(week.lt.toISOString()).toBe("2026-11-15T23:00:00.000Z");
  });

  it("uses the local date, not the UTC date", () => {
    // Already Monday in Auckland while it is still Sunday in UTC.
    const week = previousLocalWeek("Pacific/Auckland", new Date("2026-11-15T20:00:00Z"));
    expect(week.lt.toISOString()).toBe("2026-11-15T11:00:00.000Z");
  });
});

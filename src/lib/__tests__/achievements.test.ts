import { describe, expect, it } from "vitest";
import { badges, bestStreak, currentStreak } from "../achievements";

describe("streaks", () => {
  const days = new Set(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-01", "2026-11-02"]);

  it("counts the current streak, also before today's check-in", () => {
    expect(currentStreak(days, "2026-11-13")).toBe(4);
    expect(currentStreak(days, "2026-11-14")).toBe(4);
    expect(currentStreak(days, "2026-11-15")).toBe(0);
  });

  it("finds the best streak", () => {
    expect(bestStreak(days)).toBe(4);
    expect(bestStreak(new Set())).toBe(0);
  });

  it("works in weeks", () => {
    const weeks = new Set(["2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(currentStreak(weeks, "2026-11-09", 7)).toBe(3);
    expect(currentStreak(weeks, "2026-11-16", 7)).toBe(3);
    expect(bestStreak(weeks, 7)).toBe(3);
  });
});

describe("badges", () => {
  it("awards by thresholds", () => {
    const earned = badges({
      workouts: 12,
      longestRunM: 10500,
      longestRideM: 0,
      longestSwimM: 0,
      mealsLogged: 0,
      bestCheckInStreak: 7,
      bestActiveWeekStreak: 2,
    })
      .filter((b) => b.earned)
      .map((b) => b.id);
    expect(earned).toEqual(["first-workout", "workouts-10", "run-5k", "run-10k", "checkin-7"]);
  });
});

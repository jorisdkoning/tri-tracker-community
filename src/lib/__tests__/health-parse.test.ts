import { describe, expect, it } from "vitest";
import {
  aggregateDailyMetrics,
  classifyWorkout,
  dayKey,
  extractPayload,
  flexNumber,
  parseWorkoutDate,
} from "@/lib/health-parse";

const NOW = Date.parse("2026-11-04T12:00:00Z");

describe("classifyWorkout", () => {
  it.each([
    ["Traditionele Krachttraining", "strength"],
    ["Traditional Strength Training", "strength"],
    ["Functional Strength Training", "strength"],
    ["Core Training", "strength"],
    ["Zwemmen", "swim"],
    ["Pool Swim", "swim"],
    ["Hardlopen", null],
    ["Cycling", null],
    ["", null],
  ])("%s -> %s", (name, kind) => {
    expect(classifyWorkout(name)).toBe(kind);
  });
});

describe("dayKey", () => {
  it("returns the local day prefix of a Health Auto Export date", () => {
    expect(dayKey("2026-11-02 18:00:00 +0100", NOW)).toBe("2026-11-02");
  });
  it("rejects malformed, impossible and out-of-window dates", () => {
    expect(dayKey("nonsense", NOW)).toBeNull();
    expect(dayKey("2026-99-99 00:00:00 +0200", NOW)).toBeNull();
    expect(dayKey("1999-01-01 00:00:00 +0100", NOW)).toBeNull();
    expect(dayKey("2030-01-01 00:00:00 +0100", NOW)).toBeNull();
  });
});

describe("parseWorkoutDate", () => {
  it("parses a plausible date and rejects the rest", () => {
    expect(parseWorkoutDate("2026-11-02T18:00:00+01:00", NOW)?.toISOString()).toBe("2026-11-02T17:00:00.000Z");
    expect(parseWorkoutDate(undefined, NOW)).toBeNull();
    expect(parseWorkoutDate("not a date", NOW)).toBeNull();
    expect(parseWorkoutDate("1990-01-01T00:00:00Z", NOW)).toBeNull();
  });
});

describe("flexNumber", () => {
  it("reads plain numbers and {qty} objects", () => {
    expect(flexNumber(42)).toBe(42);
    expect(flexNumber({ qty: 3.5 })).toBe(3.5);
  });
  it("returns null for anything else", () => {
    expect(flexNumber(undefined)).toBeNull();
    expect(flexNumber({})).toBeNull();
    expect(flexNumber(Number.NaN)).toBeNull();
  });
});

describe("aggregateDailyMetrics", () => {
  it("averages data points per day and metric", () => {
    const result = aggregateDailyMetrics(
      [
        {
          name: "heart_rate_variability",
          data: [
            { date: "2026-11-03 02:00:00 +0100", qty: 60 },
            { date: "2026-11-03 04:00:00 +0100", qty: 70 },
          ],
        },
        { name: "resting_heart_rate", data: [{ date: "2026-11-03 00:00:00 +0100", qty: 52 }] },
      ],
      NOW
    );
    expect(result.get("2026-11-03")).toEqual({ hrv: 65, restingHr: 52 });
  });
  it("uses total sleep for sleep_analysis", () => {
    const result = aggregateDailyMetrics(
      [{ name: "sleep_analysis", data: [{ date: "2026-11-03 00:00:00 +0100", totalSleep: 7.5, asleep: 7 }] }],
      NOW
    );
    expect(result.get("2026-11-03")?.sleepHours).toBe(7.5);
  });
  it("ignores unknown metrics, bad dates and absurd values", () => {
    const result = aggregateDailyMetrics(
      [
        { name: "step_count", data: [{ date: "2026-11-03 00:00:00 +0100", qty: 9000 }] },
        { name: "weight_body_mass", data: [{ date: "bad", qty: 70 }, { date: "2026-11-03 00:00:00 +0100", qty: 999999 }] },
      ],
      NOW
    );
    expect(result.size).toBe(0);
  });
});

describe("extractPayload", () => {
  it("returns metrics and workouts", () => {
    expect(extractPayload({ data: { workouts: [{ name: "Zwemmen" }] } })).toEqual({
      metrics: [],
      workouts: [{ name: "Zwemmen" }],
    });
  });
  it("returns null for empty or malformed bodies", () => {
    expect(extractPayload({ data: {} })).toBeNull();
    expect(extractPayload(null)).toBeNull();
    expect(extractPayload({ data: { metrics: "nope" } })).toBeNull();
  });
});

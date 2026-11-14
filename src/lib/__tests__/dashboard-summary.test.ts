import { describe, expect, it } from "vitest";
import { combineRecent, formLabel, latestValue, summarizeWeek } from "@/lib/dashboard-summary";

describe("formLabel", () => {
  it.each([
    [15, "Fresh"],
    [10, "Fresh"],
    [0, "Balanced"],
    [-10, "Balanced"],
    [-20, "Loaded"],
    [-30, "Loaded"],
    [-45, "Overreaching"],
  ])("tsb %i -> %s", (tsb, label) => {
    expect(formLabel(tsb).label).toBe(label);
  });
});

describe("summarizeWeek", () => {
  it("totals per sport and adds strength time to the overall total", () => {
    const week = summarizeWeek(
      [
        { sport: "BIKE", movingTime: 3600, distance: 30000 },
        { sport: "BIKE", movingTime: 1800, distance: 12000 },
        { sport: "RUN", movingTime: 1200, distance: 3000 },
        { sport: "OTHER", movingTime: 600, distance: 0 },
      ],
      [{ durationSec: 3300 }, { durationSec: null }]
    );
    expect(week.bySport.BIKE).toEqual({ time: 5400, distance: 42000, count: 2 });
    expect(week.bySport.RUN.count).toBe(1);
    expect(week.bySport.SWIM).toEqual({ time: 0, distance: 0, count: 0 });
    expect(week.strength).toEqual({ time: 3300, count: 2 });
    // OTHER has no card but still counts towards the total.
    expect(week.totalTime).toBe(3600 + 1800 + 1200 + 600 + 3300);
  });
  it("is all zeros for an empty week", () => {
    const week = summarizeWeek([], []);
    expect(week.totalTime).toBe(0);
    expect(week.strength.count).toBe(0);
  });
});

describe("combineRecent", () => {
  const activities = [
    { id: "a1", name: "Ride", sport: "BIKE", startDate: new Date("2026-11-02T08:00:00Z"), movingTime: 3600, distance: 25000 },
    { id: "a2", name: "Run", sport: "RUN", startDate: new Date("2026-10-30T17:00:00Z"), movingTime: 1500, distance: 4000 },
  ];
  const gym = [
    { id: "g1", date: new Date("2026-11-02"), notes: "Legs", durationSec: 3300 },
    { id: "g2", date: new Date("2026-10-17"), notes: null, durationSec: null },
  ];

  it("merges newest first and prefixes gym ids", () => {
    const items = combineRecent(activities, gym);
    expect(items.map((i) => i.id)).toEqual(["a1", "gym-g1", "a2", "gym-g2"]);
  });
  it("labels gym sessions with their note or a default", () => {
    const items = combineRecent(activities, gym);
    expect(items.find((i) => i.id === "gym-g1")).toMatchObject({ name: "Legs", sport: "STRENGTH", distance: 0 });
    expect(items.find((i) => i.id === "gym-g2")?.name).toBe("Strength training");
  });
  it("respects the limit", () => {
    expect(combineRecent(activities, gym, 2)).toHaveLength(2);
  });
});

describe("latestValue", () => {
  const rows = [
    { hrv: null as number | null, weight: 66.4 as number | null },
    { hrv: 62 as number | null, weight: null as number | null },
    { hrv: 58 as number | null, weight: 67 as number | null },
  ];
  it("returns the newest non-null value", () => {
    expect(latestValue(rows, "hrv")).toBe(62);
    expect(latestValue(rows, "weight")).toBe(66.4);
  });
  it("returns null when nothing has a value", () => {
    expect(latestValue([{ hrv: null }], "hrv")).toBeNull();
  });
});

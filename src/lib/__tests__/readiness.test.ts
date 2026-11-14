import { describe, expect, it } from "vitest";
import { computeReadiness, hrvScore, loadScore, readinessFromHistory, restingHrScore, sleepScore } from "../readiness";

const empty = {
  sleepHours: null,
  hrv: null,
  hrvBaseline: null,
  restingHr: null,
  restingHrBaseline: null,
  tsb: null,
  feeling: null,
};

describe("readiness parts", () => {
  it("scores sleep, HRV, resting HR and load around sensible anchors", () => {
    expect(sleepScore(8)).toBe(100);
    expect(sleepScore(4)).toBe(15);
    expect(hrvScore(60, 60)).toBe(75);
    expect(hrvScore(48, 60)).toBe(25);
    expect(restingHrScore(55, 50)).toBe(25);
    expect(loadScore(20)).toBe(95);
    expect(loadScore(-30)).toBe(15);
  });
});

describe("computeReadiness", () => {
  it("needs at least two signals", () => {
    expect(computeReadiness(empty)).toBeNull();
    expect(computeReadiness({ ...empty, feeling: 4 })).toBeNull();
  });

  it("says ready when everything is good", () => {
    const r = computeReadiness({ ...empty, sleepHours: 8.2, hrv: 66, hrvBaseline: 60, tsb: 5, feeling: 5 });
    expect(r?.label).toBe("Ready to go");
  });

  it("explains a low score with the weakest signals", () => {
    const r = computeReadiness({ ...empty, sleepHours: 5, tsb: -25, feeling: 2, restingHr: 56, restingHrBaseline: 50 });
    expect(r?.score).toBeLessThan(40);
    expect(r?.advice).toContain("resting heart rate");
  });
});

describe("readinessFromHistory", () => {
  const today = new Date("2026-11-14T00:00:00Z");
  const day = (n: number) => new Date(today.getTime() - n * 86400000);
  const older = Array.from({ length: 6 }, (_, i) => ({ date: day(i + 2), sleepHours: 8, hrv: 60, restingHr: 50 }));

  it("keeps yesterday's recovery when today's row only has a weigh-in", () => {
    const rows = [
      { date: day(0), sleepHours: null, hrv: null, restingHr: null },
      { date: day(1), sleepHours: 5, hrv: 42, restingHr: 58 },
      ...older,
    ];
    const result = readinessFromHistory(rows, undefined, 5, today);
    expect(result?.parts.map((p) => p.key)).toEqual(expect.arrayContaining(["sleep", "hrv", "restingHr"]));
    expect(result!.score).toBeLessThan(60);
  });

  it("ignores stale readings and uses older rows as the baseline", () => {
    expect(readinessFromHistory(older, undefined, null, today)).toBeNull();
    const rows = [{ date: day(0), sleepHours: 8, hrv: 66, restingHr: 48 }, ...older];
    expect(readinessFromHistory(rows, undefined, null, today)!.score).toBeGreaterThanOrEqual(80);
  });
});

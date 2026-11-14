import { describe, expect, it } from "vitest";
import { computeReadiness, hrvScore, loadScore, restingHrScore, sleepScore } from "../readiness";

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

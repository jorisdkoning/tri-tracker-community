import { describe, expect, it } from "vitest";
import { averageFeeling, checkInNudge, feelingLabel } from "@/lib/checkin";

const entry = (feeling: number, day = 1) => ({ date: `2026-11-0${day}`, feeling });

describe("checkInNudge", () => {
  it("warns when 3 of the last 5 check-ins were low", () => {
    const nudge = checkInNudge([entry(2), entry(3), entry(1), entry(4), entry(2)]);
    expect(nudge).toContain("3 of your last 5");
  });
  it("only looks at the five most recent entries", () => {
    expect(checkInNudge([entry(4), entry(4), entry(4), entry(4), entry(4), entry(1), entry(1), entry(1)])).toBeNull();
  });
  it("says it is fine to skip when today is the lowest score", () => {
    expect(checkInNudge([entry(1), entry(4)])).toContain("wrecked");
  });
  it("stays quiet when things are fine or there is no data", () => {
    expect(checkInNudge([entry(3), entry(4), entry(2)])).toBeNull();
    expect(checkInNudge([])).toBeNull();
  });
});

describe("averageFeeling and labels", () => {
  it("averages to one decimal", () => {
    expect(averageFeeling([entry(2), entry(3), entry(5)])).toBe(3.3);
    expect(averageFeeling([])).toBeNull();
  });
  it("maps values to labels", () => {
    expect(feelingLabel(2)).toBe("Tired");
    expect(feelingLabel(9)).toBe("");
  });
});

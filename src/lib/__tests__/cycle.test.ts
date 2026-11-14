import { describe, expect, it } from "vitest";
import { averageCycleLength, cycleDayOn, cycleStatus, phaseAverages, phaseForDay } from "../cycle";

const starts = ["2026-08-01", "2026-08-31", "2026-09-30", "2026-10-30"];

describe("cycle", () => {
  it("averages cycle lengths and ignores missed logs", () => {
    expect(averageCycleLength(starts)).toBe(30);
    expect(averageCycleLength(["2026-01-01", "2026-04-01"])).toBe(28);
    expect(averageCycleLength([])).toBe(28);
  });

  it("finds the phase for a day", () => {
    expect(phaseForDay(3, 28)).toBe("Period");
    expect(phaseForDay(9, 28)).toBe("Follicular");
    expect(phaseForDay(14, 28)).toBe("Ovulation");
    expect(phaseForDay(20, 28)).toBe("Luteal");
  });

  it("works out today's status and the next period", () => {
    const status = cycleStatus(starts, "2026-11-14");
    expect(status).toMatchObject({ day: 16, length: 30, phase: "Ovulation", nextPeriod: "2026-11-29", late: false });
    expect(cycleStatus(starts, "2026-12-05")?.late).toBe(true);
    expect(cycleDayOn(starts, "2026-07-01")).toBeNull();
  });

  it("averages how you feel per phase", () => {
    const entries = ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-05", "2026-11-06", "2026-11-07"].map(
      (date, i) => ({ date, feeling: i < 3 ? 2 : 4 })
    );
    const result = phaseAverages(starts, entries);
    expect(result.Period.feeling).toBe(2);
    expect(result.Follicular.feeling).toBe(4);
    expect(result.Luteal.feeling).toBeNull();
  });
});

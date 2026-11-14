import { describe, expect, it } from "vitest";
import { getDailyTargets } from "@/lib/nutrition";

describe("getDailyTargets", () => {
  it("scales calories with the training tier", () => {
    const rest = getDailyTargets("rest").calories;
    const heavy = getDailyTargets("heavy").calories;
    expect(heavy).toBeGreaterThan(rest);
  });
  it("sets protein from body weight", () => {
    expect(getDailyTargets("rest", 70).proteinG).toBe(126);
    expect(getDailyTargets("rest", 90).calories).toBeGreaterThan(getDailyTargets("rest", 60).calories);
  });
});

import { describe, expect, it } from "vitest";
import { checkFodmap, effectiveFodmapRisk, getDailyTargets } from "@/lib/nutrition";

describe("checkFodmap", () => {
  it.each([
    ["pasta with onions", "high"],
    ["apple and garlic bread", "high"],
    ["uien en rijst", "high"],
    ["milk with cereal", "low"],
    ["fruit salad", "low"],
    ["quinoa bowl", "low"],
  ])("%s -> %s", (text, risk) => {
    expect(checkFodmap(text).risk).toBe(risk);
  });

  it("does not flag foods that say they are free of the ingredient", () => {
    expect(checkFodmap("Gluten-free spaghetti with lactose-free cream").risk).toBe("low");
    expect(checkFodmap("yoghurt lactosevrij").risk).toBe("low");
    expect(checkFodmap("pizza with onion-free sauce").risk).toBe("low");
  });

  it("still flags the ingredient when it is also mentioned plainly", () => {
    expect(checkFodmap("lactose-free milk and a plain wheat roll").risk).toBe("high");
  });
});

describe("effectiveFodmapRisk", () => {
  it("recomputes free-text meals so old false positives disappear", () => {
    expect(
      effectiveFodmapRisk({ fodmapRisk: "HIGH", description: "lactose-free yoghurt", safeFoodId: null })
    ).toBe("LOW");
  });
  it("keeps the rating of a linked saved food", () => {
    expect(
      effectiveFodmapRisk({ fodmapRisk: "MEDIUM", description: "oats", safeFoodId: "food_1" })
    ).toBe("MEDIUM");
  });
});

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

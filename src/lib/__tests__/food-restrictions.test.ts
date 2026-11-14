import { describe, expect, it } from "vitest";
import { checkRestrictions, normalizeRestrictions, restrictionWarning } from "@/lib/food-restrictions";

const labels = (text: string, restrictions: string[]) => checkRestrictions(text, restrictions).map((f) => f.label);

describe("checkRestrictions", () => {
  it("flags nothing when the user has no restrictions", () => {
    expect(checkRestrictions("pasta with onions", [])).toEqual([]);
  });

  it.each([
    ["pasta with onions", true],
    ["apple and garlic bread", true],
    ["uien en rijst", true],
    ["milk with cereal", false],
    ["fruit salad", false],
    ["quinoa bowl", false],
  ])("low-FODMAP: %s -> flagged %s", (text, flagged) => {
    expect(labels(text, ["fodmap"]).length > 0).toBe(flagged);
  });

  it("ignores ingredients the meal says it is free of", () => {
    expect(labels("pizza with onion-free sauce", ["fodmap"])).toEqual([]);
    expect(labels("yoghurt lactosevrij", ["lactose"])).toEqual([]);
    expect(labels("gluten-free spaghetti", ["gluten"])).toEqual([]);
    expect(labels("oat milk latte", ["lactose"])).toEqual([]);
    expect(labels("vegan burger with cheese", ["vegan"])).toEqual([]);
  });

  it("still flags an ingredient that is also mentioned plainly", () => {
    expect(labels("lactose-free milk and a plain wheat roll", ["fodmap"])).toEqual(["Low-FODMAP"]);
  });

  it("checks several presets and the user's own words", () => {
    expect(labels("chicken wrap with mushrooms and peanut sauce", ["vegetarian", "nuts", "gluten", "mushroom"])).toEqual([
      "Vegetarian",
      "Nuts",
      "Gluten",
      "mushroom",
    ]);
    expect(labels("toast with egg", ["egg", "gluten"])).toEqual(["Eggs", "Gluten"]);
  });

  it("matches whole words only", () => {
    expect(labels("fruit juice", ["fodmap"])).toEqual([]);
    expect(labels("hamburger", ["vegetarian"])).toEqual([]);
  });

  it("builds a readable warning", () => {
    expect(restrictionWarning(checkRestrictions("bread with butter", ["gluten", "lactose"]))).toBe(
      "Doesn't fit: Gluten, Lactose / dairy (bread, butter)"
    );
    expect(restrictionWarning([])).toBeNull();
  });
});

describe("normalizeRestrictions", () => {
  it("drops unknown presets, trims and dedupes own words", () => {
    expect(normalizeRestrictions(["nuts", "x"], "Sesame;  sesame , a, Coriander")).toEqual(["nuts", "sesame", "coriander"]);
  });
});

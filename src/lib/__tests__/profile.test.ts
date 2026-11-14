import { describe, expect, it } from "vitest";
import { parseProfileForm } from "@/lib/profile";

function form(values: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) for (const item of [v].flat()) fd.append(k, item);
  return fd;
}

describe("parseProfileForm", () => {
  const base = { name: "Sam", timezone: "America/New_York", currency: "USD" };
  it("accepts an empty weight and a comma decimal", () => {
    const empty = parseProfileForm(form({ ...base, weightKg: "" }));
    expect(empty.success && empty.data.weightKg).toBeNull();
    const comma = parseProfileForm(form({ ...base, weightKg: "66,5" }));
    expect(comma.success && comma.data).toMatchObject({ weightKg: 66.5, foodRestrictions: [] });
  });
  it("keeps known presets and the user's own words", () => {
    const parsed = parseProfileForm(
      form({ ...base, weightKg: "", restriction: ["gluten", "bogus"], customRestrictions: " Mushrooms, sesame ,, gluten" })
    );
    expect(parsed.success && parsed.data.foodRestrictions).toEqual(["gluten", "mushrooms", "sesame"]);
  });
  it("rejects an unknown timezone", () => {
    expect(parseProfileForm(form({ ...base, timezone: "Mars/Olympus" })).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { parseProfileForm } from "@/lib/profile";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("parseProfileForm", () => {
  const base = { name: "Sam", timezone: "America/New_York", currency: "USD" };
  it("accepts an empty weight and a comma decimal", () => {
    const empty = parseProfileForm(form({ ...base, weightKg: "" }));
    expect(empty.success && empty.data.weightKg).toBeNull();
    const comma = parseProfileForm(form({ ...base, weightKg: "66,5", showFodmap: "on" }));
    expect(comma.success && comma.data).toMatchObject({ weightKg: 66.5, showFodmap: true });
  });
  it("rejects an unknown timezone", () => {
    expect(parseProfileForm(form({ ...base, timezone: "Mars/Olympus" })).success).toBe(false);
  });
});

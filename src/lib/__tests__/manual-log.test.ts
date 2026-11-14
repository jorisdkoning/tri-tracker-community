import { describe, expect, it } from "vitest";
import { bodySchema, workoutSchema } from "@/lib/manual-log";

describe("workoutSchema", () => {
  it("accepts a run with a comma decimal distance", () => {
    const r = workoutSchema.safeParse({ kind: "RUN", date: "2026-11-14", minutes: "45", distanceKm: "8,5", name: "" });
    expect(r.success && r.data.distanceKm).toBe(8.5);
  });
  it("requires minutes", () => {
    expect(workoutSchema.safeParse({ kind: "RUN", date: "2026-11-14", minutes: "0", distanceKm: "", name: "" }).success).toBe(false);
  });
});

describe("bodySchema", () => {
  it("needs at least one value", () => {
    expect(bodySchema.safeParse({ date: "2026-11-14", weightKg: "", sleepHours: "", restingHr: "" }).success).toBe(false);
    const r = bodySchema.safeParse({ date: "2026-11-14", weightKg: "70.2", sleepHours: "", restingHr: "" });
    expect(r.success && r.data).toMatchObject({ weightKg: 70.2, sleepHours: null });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { costMicros, dailyBudgetCents } from "@/lib/coach-budget";

describe("costMicros", () => {
  it("prices input at 0.10 and output at 0.50 micro-dollars per token", () => {
    expect(costMicros(1_000_000, 0)).toBe(100_000);
    expect(costMicros(0, 1_000_000)).toBe(500_000);
  });
  it("rounds up so a request never costs zero", () => {
    expect(costMicros(1, 0)).toBe(1);
  });
});

describe("dailyBudgetCents", () => {
  const original = process.env.COACH_DAILY_BUDGET_CENTS;
  afterEach(() => {
    if (original === undefined) delete process.env.COACH_DAILY_BUDGET_CENTS;
    else process.env.COACH_DAILY_BUDGET_CENTS = original;
  });

  it("defaults to 50 cents", () => {
    delete process.env.COACH_DAILY_BUDGET_CENTS;
    expect(dailyBudgetCents()).toBe(50);
  });
  it("accepts a fractional override and ignores junk", () => {
    process.env.COACH_DAILY_BUDGET_CENTS = "0.5";
    expect(dailyBudgetCents()).toBe(0.5);
    process.env.COACH_DAILY_BUDGET_CENTS = "nonsense";
    expect(dailyBudgetCents()).toBe(50);
  });
});

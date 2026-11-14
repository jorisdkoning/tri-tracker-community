import { describe, expect, it } from "vitest";
import { localWeekStartDate } from "@/lib/time";

describe("localWeekStartDate", () => {
  it("uses the local Monday when UTC is still on Sunday", () => {
    // Monday 08:00 in Auckland is Sunday 19:00 UTC.
    expect(localWeekStartDate("Pacific/Auckland", new Date("2026-11-15T19:00:00Z"))).toBe("2026-11-16");
  });

  it("uses the previous Monday on a local Sunday", () => {
    // Sunday 20:00 in New York is Monday 01:00 UTC.
    expect(localWeekStartDate("America/New_York", new Date("2026-11-16T01:00:00Z"))).toBe("2026-11-09");
  });
});

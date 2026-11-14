import { describe, expect, it } from "vitest";
import { formatDuration, formatKm } from "@/lib/format";
import { DAY_MS, startOfWeekUtc } from "@/lib/time";

describe("formatDuration", () => {
  it("shows minutes under an hour", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45 * 60)).toBe("45m");
  });
  it("shows hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3 * 3600 + 25 * 60)).toBe("3h 25m");
  });
});

describe("formatKm", () => {
  it("uses one decimal below 100 km and none above", () => {
    expect(formatKm(5400)).toBe("5.4 km");
    expect(formatKm(120000)).toBe("120 km");
  });
});

describe("startOfWeekUtc", () => {
  it("returns the Monday 00:00 UTC of the week", () => {
    const wednesday = new Date("2026-11-04T15:30:00Z");
    expect(startOfWeekUtc(wednesday).toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
  it("treats Sunday as the last day of the week", () => {
    const sunday = new Date("2026-11-08T23:59:00Z");
    expect(startOfWeekUtc(sunday).toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
  it("is stable on Monday itself", () => {
    const monday = new Date("2026-11-02T00:00:00Z");
    expect(startOfWeekUtc(monday).getTime()).toBe(monday.getTime());
    expect(DAY_MS).toBe(86_400_000);
  });
});

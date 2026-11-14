import { describe, expect, it } from "vitest";
import { cleanJoinCode, formatScore, periodStartDate, rankLeaderboard } from "../groups";

describe("rankLeaderboard", () => {
  it("sorts by value and shares ranks on ties", () => {
    const ranked = rankLeaderboard([
      { userId: "a", displayName: "Ann", value: 10 },
      { userId: "b", displayName: "Bob", value: 30 },
      { userId: "c", displayName: "Cy", value: 10 },
      { userId: "d", displayName: "Di", value: 0 },
    ]);
    expect(ranked.map((r) => [r.displayName, r.rank])).toEqual([
      ["Bob", 1],
      ["Ann", 2],
      ["Cy", 2],
      ["Di", 4],
    ]);
  });
});

describe("formatScore", () => {
  it("formats per metric", () => {
    expect(formatScore("DISTANCE", 12345)).toBe("12.3 km");
    expect(formatScore("WORKOUTS", 4)).toBe("4");
    expect(formatScore("ACTIVE_MINUTES", 0)).toBe("0 min");
  });
});

describe("periodStartDate", () => {
  it("starts weeks on local Monday and months on the 1st", () => {
    const now = new Date("2026-11-15T23:30:00Z"); // Monday 16th in Amsterdam
    expect(periodStartDate("Europe/Amsterdam", "week", now)).toBe("2026-11-16");
    expect(periodStartDate("UTC", "week", now)).toBe("2026-11-09");
    expect(periodStartDate("Europe/Amsterdam", "month", now)).toBe("2026-11-01");
  });
});

describe("cleanJoinCode", () => {
  it("accepts codes and links, rejects junk", () => {
    expect(cleanJoinCode(" AbC123xyz_-Q ")).toBe("AbC123xyz_-Q");
    expect(cleanJoinCode("https://fitlog.example/groups/join/AbC123xyz_-Q")).toBe("AbC123xyz_-Q");
    expect(cleanJoinCode("short")).toBeNull();
    expect(cleanJoinCode("bad code!!")).toBeNull();
  });
});

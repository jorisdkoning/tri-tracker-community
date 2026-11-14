import { describe, expect, it } from "vitest";
import { orderForSync } from "@/lib/cron-order";

describe("orderForSync", () => {
  it("puts never-synced and stalest users first", () => {
    const users = [
      { id: "recent", intervalsLastSync: new Date("2026-11-14"), stravaLastSync: undefined },
      { id: "never", intervalsLastSync: undefined, stravaLastSync: null },
      { id: "old", intervalsLastSync: new Date("2026-11-14"), stravaLastSync: new Date("2026-11-01") },
    ];
    expect(orderForSync(users).map((u) => u.id)).toEqual(["never", "old", "recent"]);
  });
});

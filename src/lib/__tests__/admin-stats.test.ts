import { describe, expect, it } from "vitest";
import { adminUserStatus } from "../admin-stats";

const now = new Date("2026-11-14T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("adminUserStatus", () => {
  it("uses the newest data point and counts the last 7 days as active", () => {
    const s = adminUserStatus({ lastSyncAt: null, connected: false, latestData: [daysAgo(10), daysAgo(3), null] }, now);
    expect(s.lastActive).toEqual(daysAgo(3));
    expect(s.active).toBe(true);
    expect(s.syncStale).toBe(false);
  });

  it("flags a connected app that has not synced for more than 2 days", () => {
    expect(adminUserStatus({ lastSyncAt: daysAgo(3), connected: true, latestData: [] }, now).syncStale).toBe(true);
    expect(adminUserStatus({ lastSyncAt: daysAgo(1), connected: true, latestData: [] }, now).syncStale).toBe(false);
    expect(adminUserStatus({ lastSyncAt: null, connected: true, latestData: [] }, now).syncStale).toBe(true);
  });

  it("treats someone with no data as inactive", () => {
    expect(adminUserStatus({ lastSyncAt: null, connected: false, latestData: [] }, now)).toMatchObject({
      lastActive: null,
      active: false,
    });
  });
});

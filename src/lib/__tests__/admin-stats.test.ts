import { describe, expect, it } from "vitest";
import { adminUserStatus } from "../admin-stats";

const now = new Date("2026-11-14T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("adminUserStatus", () => {
  it("uses the newest data point and counts the last 7 days as active", () => {
    const s = adminUserStatus({ connections: [], latestData: [daysAgo(10), daysAgo(3), null] }, now);
    expect(s.lastActive).toEqual(daysAgo(3));
    expect(s.active).toBe(true);
    expect(s.syncStale).toBe(false);
  });

  it("flags a connection that has not synced for more than 2 days", () => {
    const stale = (lastSyncAt: Date | null, connectedAt = daysAgo(30)) =>
      adminUserStatus({ connections: [{ lastSyncAt, connectedAt }], latestData: [] }, now).syncStale;
    expect(stale(daysAgo(3))).toBe(true);
    expect(stale(daysAgo(1))).toBe(false);
    expect(stale(null)).toBe(true);
  });

  it("gives a brand-new connection time for its first sync", () => {
    const s = adminUserStatus({ connections: [{ lastSyncAt: null, connectedAt: daysAgo(0.5) }], latestData: [] }, now);
    expect(s.syncStale).toBe(false);
  });

  it("flags one stuck connection even when another one works", () => {
    const s = adminUserStatus(
      {
        connections: [
          { lastSyncAt: daysAgo(0.1), connectedAt: daysAgo(30) },
          { lastSyncAt: daysAgo(5), connectedAt: daysAgo(30) },
        ],
        latestData: [],
      },
      now
    );
    expect(s.syncStale).toBe(true);
  });

  it("treats someone with no data as inactive", () => {
    expect(adminUserStatus({ connections: [], latestData: [] }, now)).toMatchObject({
      lastActive: null,
      active: false,
    });
  });
});

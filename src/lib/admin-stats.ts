import { DAY_MS } from "@/lib/time";

export const STALE_SYNC_DAYS = 2;
export const ACTIVE_DAYS = 7;

export interface AdminUserSignals {
  lastSyncAt: Date | null;
  connected: boolean;
  latestData: (Date | null | undefined)[];
}

// When the person last had anything new (a workout, health value, check-in or
// meal), and whether a connected app looks stuck.
export function adminUserStatus({ lastSyncAt, connected, latestData }: AdminUserSignals, now: Date) {
  const times = latestData.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  const lastActive = times.length > 0 ? new Date(Math.max(...times)) : null;
  const syncStale =
    connected && (!lastSyncAt || now.getTime() - lastSyncAt.getTime() > STALE_SYNC_DAYS * DAY_MS);
  const active = lastActive !== null && now.getTime() - lastActive.getTime() <= ACTIVE_DAYS * DAY_MS;
  return { lastActive, syncStale, active };
}

import { DAY_MS } from "@/lib/time";

export const STALE_SYNC_DAYS = 2;
export const ACTIVE_DAYS = 7;

export interface ConnectionSync {
  lastSyncAt: Date | null;
  connectedAt: Date;
}

export interface AdminUserSignals {
  connections: ConnectionSync[];
  latestData: (Date | null | undefined)[];
}

// A connection is stuck when it hasn't synced for a while, counting a brand-new
// connection from the moment it was added.
export function connectionStale({ lastSyncAt, connectedAt }: ConnectionSync, now: Date): boolean {
  return now.getTime() - (lastSyncAt ?? connectedAt).getTime() > STALE_SYNC_DAYS * DAY_MS;
}

// When the person last had anything new (a workout, health value, check-in or
// meal), and whether any connected app looks stuck.
export function adminUserStatus({ connections, latestData }: AdminUserSignals, now: Date) {
  const times = latestData.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  const lastActive = times.length > 0 ? new Date(Math.max(...times)) : null;
  const syncStale = connections.some((c) => connectionStale(c, now));
  const active = lastActive !== null && now.getTime() - lastActive.getTime() <= ACTIVE_DAYS * DAY_MS;
  return { lastActive, syncStale, active };
}

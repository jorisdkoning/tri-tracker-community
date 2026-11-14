export interface SyncCandidate {
  id: string;
  intervalsLastSync: Date | null | undefined;
  stravaLastSync: Date | null | undefined;
}

// Users whose oldest connection was synced longest ago go first (never-synced
// first of all), so when one cron run cannot reach everyone, the next run
// picks up where it left off.
export function orderForSync<T extends SyncCandidate>(users: T[]): T[] {
  const oldest = (u: SyncCandidate) => {
    const times = [u.intervalsLastSync, u.stravaLastSync]
      .filter((t): t is Date | null => t !== undefined)
      .map((t) => (t ? t.getTime() : 0));
    return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
  };
  return [...users].sort((a, b) => oldest(a) - oldest(b));
}

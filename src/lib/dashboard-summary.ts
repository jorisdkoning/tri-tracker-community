// Pure calculations behind the dashboard (no database access), so they can be
// unit tested.

export interface FormLabel {
  label: string;
  tone: string; // tailwind classes
}

// Training Stress Balance -> how fresh or loaded the athlete is.
export function formLabel(tsb: number): FormLabel {
  if (tsb >= 10) return { label: "Fresh", tone: "bg-good/15 text-good" };
  if (tsb >= -10) return { label: "Balanced", tone: "bg-accent/15 text-accent" };
  if (tsb >= -30) return { label: "Loaded", tone: "bg-warn/15 text-warn" };
  return { label: "Overreaching", tone: "bg-run/15 text-run" };
}

export const ENDURANCE_SPORTS = ["SWIM", "BIKE", "RUN"] as const;
export type EnduranceSport = (typeof ENDURANCE_SPORTS)[number];

export interface SportTotals {
  time: number; // seconds
  distance: number; // meters
  count: number;
}

export interface WeekSummary {
  bySport: Record<EnduranceSport, SportTotals>;
  strength: { time: number; count: number };
  // Every activity (also sports without their own card) plus strength time.
  totalTime: number;
}

export function summarizeWeek(
  activities: { sport: string; movingTime: number; distance: number }[],
  gymSessions: { durationSec: number | null }[]
): WeekSummary {
  const bySport = Object.fromEntries(
    ENDURANCE_SPORTS.map((sport) => [sport, { time: 0, distance: 0, count: 0 }])
  ) as Record<EnduranceSport, SportTotals>;

  for (const activity of activities) {
    const entry = bySport[activity.sport as EnduranceSport];
    if (!entry) continue;
    entry.time += activity.movingTime;
    entry.distance += activity.distance;
    entry.count += 1;
  }

  const strengthTime = gymSessions.reduce((sum, g) => sum + (g.durationSec ?? 0), 0);
  const activityTime = activities.reduce((sum, a) => sum + a.movingTime, 0);

  return {
    bySport,
    strength: { time: strengthTime, count: gymSessions.length },
    totalTime: activityTime + strengthTime,
  };
}

export interface RecentItem {
  id: string;
  name: string;
  sport: string; // Sport enum value or "STRENGTH"
  when: Date;
  movingTime: number;
  distance: number;
}

// Newest first. Gym sessions have a date but no time, so activities from the
// same day sort ahead of them.
export function combineRecent(
  activities: {
    id: string;
    name: string;
    sport: string;
    startDate: Date;
    movingTime: number;
    distance: number;
  }[],
  gymSessions: { id: string; date: Date; notes: string | null; durationSec: number | null }[],
  limit = 5
): RecentItem[] {
  return [
    ...activities.map((a) => ({
      id: a.id,
      name: a.name,
      sport: a.sport,
      when: a.startDate,
      movingTime: a.movingTime,
      distance: a.distance,
    })),
    ...gymSessions.map((g) => ({
      id: `gym-${g.id}`,
      name: g.notes || "Strength training",
      sport: "STRENGTH",
      when: g.date,
      movingTime: g.durationSec ?? 0,
      distance: 0,
    })),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, limit);
}

// Most recent non-null value of one column from rows sorted newest first.
export function latestValue<T, K extends keyof T>(rows: T[], key: K): number | null {
  const row = rows.find((r) => r[key] != null);
  return row ? (row[key] as unknown as number) : null;
}

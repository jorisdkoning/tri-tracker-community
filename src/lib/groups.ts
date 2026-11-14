// Groups and challenges: labels, scoring and ranking. Pure, no database access.
import type { ChallengeMetric } from "@prisma/client";
import { formatDuration } from "@/lib/format";
import { localDateString, localWeekStartDate } from "@/lib/time";

export const METRIC_LABELS: Record<ChallengeMetric, string> = {
  ACTIVE_MINUTES: "Most active time",
  WORKOUTS: "Most workouts",
  DISTANCE: "Most kilometres",
  CHECKINS: "Most daily check-ins",
};

export type Period = "week" | "month";

export const MAX_GROUPS_CREATED = 10;
export const MAX_MEMBERS = 100;

// ACTIVE_MINUTES values are seconds, DISTANCE values are metres.
export function formatScore(metric: ChallengeMetric, value: number): string {
  switch (metric) {
    case "ACTIVE_MINUTES":
      return value > 0 ? formatDuration(value) : "0 min";
    case "DISTANCE":
      return `${(value / 1000).toFixed(1)} km`;
    default:
      return String(value);
  }
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  value: number;
}

export function rankLeaderboard(entries: LeaderboardEntry[]): (LeaderboardEntry & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => b.value - a.value || a.displayName.localeCompare(b.displayName));
  return sorted.map((entry, i) => ({
    ...entry,
    rank: i > 0 && sorted[i - 1].value === entry.value ? sortedRank(sorted, i) : i + 1,
  }));
}

function sortedRank(sorted: LeaderboardEntry[], i: number): number {
  let j = i;
  while (j > 0 && sorted[j - 1].value === sorted[i].value) j--;
  return j + 1;
}

// Local date (YYYY-MM-DD) the period starts on.
export function periodStartDate(timeZone: string, period: Period, now: Date = new Date()): string {
  return period === "week" ? localWeekStartDate(timeZone, now) : `${localDateString(timeZone, now).slice(0, 7)}-01`;
}

// Accepts a bare code or a full invite link.
export function cleanJoinCode(input: string): string | null {
  const code = input.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";
  return /^[A-Za-z0-9_-]{8,32}$/.test(code) ? code : null;
}

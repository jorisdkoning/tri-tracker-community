import type { Activity, Sport } from "@prisma/client";

import { formatDuration } from "@/lib/format";
export interface PersonalBest {
  label: string;
  activityName: string;
  date: string;
  value: string;
}

// Only the columns these stats need — callers can select a subset and skip
// heavy fields like rawJson.
export type ActivityStatsRow = Pick<
  Activity,
  "sport" | "name" | "startDate" | "movingTime" | "distance" | "avgPower" | "elevationGain"
>;

// Picks out the single best activity per metric, per sport — the "peak
// efforts" a triathlete actually cares about (longest ride/run, hardest
// power, fastest pace, biggest climb), rather than just recent averages.
export function computePersonalBests(
  activities: ActivityStatsRow[],
  sport: Sport
): PersonalBest[] {
  const inSport = activities.filter((a) => a.sport === sport);
  if (inSport.length === 0) return [];

  const bests: PersonalBest[] = [];

  const byDistance = [...inSport].sort((a, b) => b.distance - a.distance)[0];
  bests.push({
    label: "Longest distance",
    activityName: byDistance.name,
    date: byDistance.startDate.toISOString().slice(0, 10),
    value: `${(byDistance.distance / 1000).toFixed(1)} km`,
  });

  const byDuration = [...inSport].sort((a, b) => b.movingTime - a.movingTime)[0];
  bests.push({
    label: "Longest duration",
    activityName: byDuration.name,
    date: byDuration.startDate.toISOString().slice(0, 10),
    value: formatDuration(byDuration.movingTime),
  });

  if (sport === "BIKE") {
    const withPower = inSport.filter((a) => a.avgPower != null);
    if (withPower.length > 0) {
      const byPower = [...withPower].sort((a, b) => b.avgPower! - a.avgPower!)[0];
      bests.push({
        label: "Highest avg power",
        activityName: byPower.name,
        date: byPower.startDate.toISOString().slice(0, 10),
        value: `${Math.round(byPower.avgPower!)}W`,
      });
    }
  }

  if (sport === "RUN") {
    const withPace = inSport.filter((a) => a.distance >= 1000);
    if (withPace.length > 0) {
      const byPace = [...withPace].sort(
        (a, b) => a.movingTime / a.distance - b.movingTime / b.distance
      )[0];
      bests.push({
        label: "Best pace",
        activityName: byPace.name,
        date: byPace.startDate.toISOString().slice(0, 10),
        value: formatPace(byPace.movingTime, byPace.distance),
      });
    }
  }

  const withElevation = inSport.filter((a) => a.elevationGain != null);
  if (withElevation.length > 0) {
    const byElevation = [...withElevation].sort(
      (a, b) => b.elevationGain! - a.elevationGain!
    )[0];
    if (byElevation.elevationGain! > 0) {
      bests.push({
        label: "Biggest climb",
        activityName: byElevation.name,
        date: byElevation.startDate.toISOString().slice(0, 10),
        value: `${Math.round(byElevation.elevationGain!)}m`,
      });
    }
  }

  return bests;
}

function formatPace(seconds: number, meters: number) {
  const secPerKm = seconds / (meters / 1000);
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

export interface WeeklyVolumePoint {
  week: string; // e.g. "2026-W23"
  BIKE: number;
  RUN: number;
  SWIM: number;
  OTHER: number;
}

function isoWeekKey(date: Date): string {
  // ISO week: Thursday of the week's Mon-Sun range determines the year.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Buckets activity moving-time into ISO weeks per sport, in hours — the
// shape a grouped bar chart needs to compare cycling vs running volume
// over time (not just a single recent-days snapshot).
export function computeWeeklyVolume(
  activities: Pick<Activity, "sport" | "startDate" | "movingTime">[],
  weeks: number
): WeeklyVolumePoint[] {
  const now = new Date();
  const buckets = new Map<string, WeeklyVolumePoint>();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const key = isoWeekKey(d);
    if (!buckets.has(key)) {
      buckets.set(key, { week: key, BIKE: 0, RUN: 0, SWIM: 0, OTHER: 0 });
    }
  }

  for (const activity of activities) {
    const key = isoWeekKey(activity.startDate);
    const bucket = buckets.get(key);
    if (!bucket) continue; // outside the requested window
    bucket[activity.sport] += Math.round((activity.movingTime / 3600) * 10) / 10;
  }

  return Array.from(buckets.values());
}

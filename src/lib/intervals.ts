import type { Sport } from "@prisma/client";

const BASE_URL = "https://intervals.icu/api/v1";

export class IntervalsApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "IntervalsApiError";
  }
}

function authHeader(apiKey: string) {
  const token = Buffer.from(`API_KEY:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

async function intervalsFetch(apiKey: string, path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: authHeader(apiKey) },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new IntervalsApiError(
      res.status,
      `intervals.icu request failed (${res.status}): ${path}`
    );
  }

  return res.json();
}

// Field names verified against the intervals.icu OpenAPI spec.
export interface IntervalsActivity {
  id: string;
  type: string;
  name: string;
  start_date: string;
  moving_time: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  icu_average_watts?: number;
  icu_training_load?: number;
}

export interface IntervalsWellness {
  id: string; // ISO-8601 local date
  ctl?: number;
  atl?: number;
  restingHR?: number;
  hrv?: number;
  sleepSecs?: number;
  weight?: number;
}

export async function fetchAthleteProfile(apiKey: string) {
  return intervalsFetch(apiKey, "/athlete/0") as Promise<{
    id: string;
    name?: string;
  }>;
}

export async function fetchActivities(
  apiKey: string,
  oldest: string,
  newest?: string
) {
  const params = new URLSearchParams({ oldest });
  if (newest) params.set("newest", newest);
  return intervalsFetch(
    apiKey,
    `/athlete/0/activities?${params.toString()}`
  ) as Promise<IntervalsActivity[]>;
}

export async function fetchWellness(
  apiKey: string,
  oldest: string,
  newest?: string
) {
  const params = new URLSearchParams({ oldest });
  if (newest) params.set("newest", newest);
  return intervalsFetch(
    apiKey,
    `/athlete/0/wellness?${params.toString()}`
  ) as Promise<IntervalsWellness[]>;
}

export interface IntervalsEvent {
  id: number;
  category: string;
  type?: string | null;
  name?: string | null;
  description?: string | null;
  start_date_local: string;
  moving_time?: number | null;
  icu_training_load?: number | null;
}

export async function fetchEvents(apiKey: string, oldest: string, newest: string) {
  const params = new URLSearchParams({ oldest, newest });
  return intervalsFetch(
    apiKey,
    `/athlete/0/events?${params.toString()}`
  ) as Promise<IntervalsEvent[]>;
}

const BIKE_TYPES = new Set([
  "Ride",
  "VirtualRide",
  "GravelRide",
  "MountainBikeRide",
  "EBikeRide",
]);
const RUN_TYPES = new Set(["Run", "VirtualRun", "TrailRun", "TreadmillRun"]);
const SWIM_TYPES = new Set(["Swim", "OpenWaterSwim"]);

export function mapIntervalsSport(type: string): Sport {
  if (BIKE_TYPES.has(type)) return "BIKE";
  if (RUN_TYPES.has(type)) return "RUN";
  if (SWIM_TYPES.has(type)) return "SWIM";
  return "OTHER";
}

// Pure parsing of the JSON that the Health Auto Export iOS app posts
// ({ "data": { "metrics": [...], "workouts": [...] } }). No database access.

export interface HealthDataPoint {
  date: string;
  qty?: number;
  asleep?: number;
  totalSleep?: number;
}

export interface HealthMetric {
  name: string;
  units?: string;
  data: HealthDataPoint[];
}

// The workout shape varies slightly by export template: numeric fields
// sometimes arrive as a plain number, sometimes as {qty, units}.
export type FlexibleNumber = number | { qty?: number } | undefined;

export interface HealthWorkout {
  name?: string;
  start?: string;
  end?: string;
  duration?: FlexibleNumber; // seconds
  distance?: FlexibleNumber; // meters (normalised to m by default)
  activeEnergyBurned?: FlexibleNumber;
  totalEnergyBurned?: FlexibleNumber;
}

export type DailyMetricField = "restingHr" | "hrv" | "sleepHours" | "weightKg";
export type DailyValues = Partial<Record<DailyMetricField, number>>;

export const METRIC_FIELDS: Record<string, DailyMetricField> = {
  resting_heart_rate: "restingHr",
  heart_rate_variability: "hrv",
  sleep_analysis: "sleepHours",
  weight_body_mass: "weightKg",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TEN_YEARS_MS = 10 * 365 * DAY_MS;

// Workout names arrive localized to the phone's language (e.g. Dutch
// "Traditionele Krachttraining" for "Traditional Strength Training"), so
// classify by keyword substring across languages rather than exact phrases.
const SWIM_KEYWORDS = ["swim", "zwem"];
const STRENGTH_KEYWORDS = ["strength", "kracht", "core training", "krachttraining"];

export type WorkoutKind = "swim" | "strength" | null;

export function classifyWorkout(name: string): WorkoutKind {
  const lower = name.trim().toLowerCase();
  if (SWIM_KEYWORDS.some((keyword) => lower.includes(keyword))) return "swim";
  if (STRENGTH_KEYWORDS.some((keyword) => lower.includes(keyword))) return "strength";
  return null;
}

// Rejects nonsense or far-off dates so a corrupted payload can't create junk rows.
function withinPlausibleWindow(time: number, now: number): boolean {
  return time >= now - TEN_YEARS_MS && time <= now + DAY_MS;
}

// Dates arrive as "2026-07-07 00:00:00 +0200"; the local day is the prefix.
export function dayKey(date: string, now: number = Date.now()): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(date);
  if (!match) return null;
  const parsed = new Date(match[1]);
  if (Number.isNaN(parsed.getTime())) return null;
  return withinPlausibleWindow(parsed.getTime(), now) ? match[1] : null;
}

export function parseWorkoutDate(value: string | undefined, now: number = Date.now()): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return withinPlausibleWindow(date.getTime(), now) ? date : null;
}

export function flexNumber(value: FlexibleNumber): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value && typeof value === "object" && typeof value.qty === "number") {
    return Number.isFinite(value.qty) ? value.qty : null;
  }
  return null;
}

function pointValue(metricName: string, point: HealthDataPoint): number | null {
  if (metricName === "sleep_analysis") return point.totalSleep ?? point.asleep ?? null;
  return point.qty ?? null;
}

// Per day and supported metric, the average of all data points.
export function aggregateDailyMetrics(
  metrics: HealthMetric[],
  now: number = Date.now()
): Map<string, DailyValues> {
  const sums = new Map<string, { day: string; field: DailyMetricField; total: number; count: number }>();

  for (const metric of metrics) {
    const field = METRIC_FIELDS[metric.name];
    if (!field || !Array.isArray(metric.data)) continue;

    for (const point of metric.data) {
      const day = dayKey(point.date ?? "", now);
      const value = pointValue(metric.name, point);
      // Loose sanity cap: no real HR/HRV/sleep/weight value gets near it, but
      // it blocks absurd values from bad payloads.
      if (!day || value == null || !Number.isFinite(value)) continue;
      if (value < 0 || value > 100000) continue;

      const key = `${day}:${field}`;
      const sum = sums.get(key) ?? { day, field, total: 0, count: 0 };
      sum.total += value;
      sum.count += 1;
      sums.set(key, sum);
    }
  }

  const perDay = new Map<string, DailyValues>();
  for (const { day, field, total, count } of sums.values()) {
    const entry = perDay.get(day) ?? {};
    entry[field] = Math.round((total / count) * 100) / 100;
    perDay.set(day, entry);
  }
  return perDay;
}

// Null when the body has neither metrics nor workouts.
export function extractPayload(
  body: unknown
): { metrics: HealthMetric[]; workouts: HealthWorkout[] } | null {
  const data = (body as { data?: { metrics?: unknown; workouts?: unknown } } | null)?.data;
  const metrics = Array.isArray(data?.metrics) ? (data!.metrics as HealthMetric[]) : [];
  const workouts = Array.isArray(data?.workouts) ? (data!.workouts as HealthWorkout[]) : [];
  return metrics.length === 0 && workouts.length === 0 ? null : { metrics, workouts };
}

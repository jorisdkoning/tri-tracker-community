// Cycle-aware training: cycle day, phase and how the person feels per phase.
// Pure, no database access; dates are YYYY-MM-DD.
import { DAY_MS } from "@/lib/time";

export type CyclePhase = "Period" | "Follicular" | "Ovulation" | "Luteal";

export const PHASE_TIPS: Record<CyclePhase, string> = {
  Period: "Energy can be lower. Move in a way that feels good; easy sessions are fine.",
  Follicular: "Energy often rises now. A good time for harder sessions and trying new things.",
  Ovulation: "Many people feel strong now. Warm up well and enjoy the good days.",
  Luteal: "You may feel warmer and tire sooner. Eat enough, drink more and keep hard efforts shorter.",
};

const DEFAULT_LENGTH = 28;
const days = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / DAY_MS);

// Cycle lengths between consecutive starts, ignoring gaps that are likely missed logs.
export function cycleLengths(starts: string[]): number[] {
  const sorted = [...starts].sort();
  return sorted.slice(1).map((s, i) => days(sorted[i], s)).filter((n) => n >= 21 && n <= 45);
}

export function averageCycleLength(starts: string[]): number {
  const recent = cycleLengths(starts).slice(-6);
  return recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : DEFAULT_LENGTH;
}

export function phaseForDay(day: number, length: number): CyclePhase {
  const ovulation = length - 14;
  if (day <= 5) return "Period";
  if (Math.abs(day - ovulation) <= 1) return "Ovulation";
  return day < ovulation ? "Follicular" : "Luteal";
}

// 1-based day of the cycle that `date` falls in, or null if unknown or too long ago.
export function cycleDayOn(starts: string[], date: string): number | null {
  const start = [...starts].sort().filter((s) => s <= date).pop();
  if (!start) return null;
  const day = days(start, date) + 1;
  return day <= 60 ? day : null;
}

export interface CycleStatus {
  day: number;
  length: number;
  phase: CyclePhase;
  tip: string;
  nextPeriod: string;
  late: boolean;
}

export function cycleStatus(starts: string[], today: string): CycleStatus | null {
  const day = cycleDayOn(starts, today);
  if (day == null) return null;
  const length = averageCycleLength(starts);
  const phase = phaseForDay(day, length);
  const latest = [...starts].sort().filter((s) => s <= today).pop()!;
  const nextPeriod = new Date(new Date(`${latest}T00:00:00Z`).getTime() + length * DAY_MS).toISOString().slice(0, 10);
  return { day, length, phase, tip: PHASE_TIPS[phase], nextPeriod, late: day > length + 3 };
}

export interface DayEntry {
  date: string;
  feeling?: number | null;
  hrv?: number | null;
  sleepHours?: number | null;
}

export type PhaseAverages = Record<CyclePhase, { feeling: number | null; hrv: number | null; sleepHours: number | null }>;

const PHASES: CyclePhase[] = ["Period", "Follicular", "Ovulation", "Luteal"];

// Average check-in, HRV and sleep per phase (needs 3+ values to show one).
export function phaseAverages(starts: string[], entries: DayEntry[]): PhaseAverages {
  const length = averageCycleLength(starts);
  const buckets = Object.fromEntries(
    PHASES.map((p) => [p, { feeling: [] as number[], hrv: [] as number[], sleepHours: [] as number[] }])
  ) as Record<CyclePhase, Record<"feeling" | "hrv" | "sleepHours", number[]>>;
  for (const entry of entries) {
    const day = cycleDayOn(starts, entry.date);
    if (day == null || day > 45) continue;
    const bucket = buckets[phaseForDay(day, length)];
    for (const key of ["feeling", "hrv", "sleepHours"] as const) {
      const value = entry[key];
      if (value != null) bucket[key].push(value);
    }
  }
  const avg = (values: number[]) =>
    values.length >= 3 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
  return Object.fromEntries(
    PHASES.map((p) => [p, { feeling: avg(buckets[p].feeling), hrv: avg(buckets[p].hrv), sleepHours: avg(buckets[p].sleepHours) }])
  ) as PhaseAverages;
}

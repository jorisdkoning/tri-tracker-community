// Event countdown plan: which phase you are in and whether your weekly
// training volume is on track. Pure, no database access.
import type { DistanceType } from "@prisma/client";

export type Phase = "Base" | "Build" | "Peak" | "Taper" | "Event week";

const TAPER_WEEKS: Record<DistanceType, number> = {
  SPRINT: 1,
  OLYMPIC: 1,
  HALF_IRONMAN: 2,
  IRONMAN: 3,
  OTHER: 1,
};
const PEAK_WEEKS = 2;
const BUILD_WEEKS = 8;

export const PHASE_ADVICE: Record<Phase, string> = {
  Base: "Build a habit: mostly easy, steady training and slowly a bit more each week.",
  Build: "Add some harder sessions and grow your longest workout step by step.",
  Peak: "Your biggest weeks: practise event pace, food and kit, then recover well.",
  Taper: "Train less (about two thirds of usual) but keep a few short, sharp efforts. Sleep a lot.",
  "Event week": "Only short, easy sessions. Rest, eat well and enjoy the day!",
};

export function phaseFor(weeksOut: number, distance: DistanceType): Phase {
  const taper = TAPER_WEEKS[distance];
  if (weeksOut <= 0) return "Event week";
  if (weeksOut <= taper) return "Taper";
  if (weeksOut <= taper + PEAK_WEEKS) return "Peak";
  if (weeksOut <= taper + PEAK_WEEKS + BUILD_WEEKS) return "Build";
  return "Base";
}

export interface PlanWeek {
  weeksOut: number;
  phase: Phase;
}

export interface EventPlan {
  weeksOut: number;
  phase: Phase;
  advice: string;
  weeks: PlanWeek[];
  warning: string | null;
  lastWeekHours: number | null;
}

// weeklyHours: completed weeks, oldest first (the current week is excluded).
export function eventPlan(daysToEvent: number, distance: DistanceType, weeklyHours: number[]): EventPlan {
  const weeksOut = Math.max(0, Math.floor(daysToEvent / 7));
  const phase = phaseFor(weeksOut, distance);
  const shown = Math.min(weeksOut, 15);
  const weeks = Array.from({ length: shown + 1 }, (_, i) => {
    const out = shown - i;
    return { weeksOut: out, phase: phaseFor(out, distance) };
  });
  return {
    weeksOut,
    phase,
    advice: PHASE_ADVICE[phase],
    weeks,
    warning: volumeWarning(phase, weeklyHours),
    lastWeekHours: weeklyHours.length > 0 ? weeklyHours[weeklyHours.length - 1] : null,
  };
}

export function volumeWarning(phase: Phase, weeklyHours: number[]): string | null {
  if (weeklyHours.length < 4) return null;
  const last = weeklyHours[weeklyHours.length - 1];
  const before = weeklyHours.slice(-4, -1);
  const usual = before.reduce((sum, h) => sum + h, 0) / before.length;
  if (usual < 1) return null;
  if (phase === "Taper" || phase === "Event week") {
    return last > usual * 0.9 ? "You're still training as much as usual. Cut back now so you start fresh." : null;
  }
  if (last > usual * 1.3) {
    const pct = Math.round((last / usual - 1) * 100);
    return `Careful: last week was ${pct}% more than your usual. Grow by about 10% a week to avoid injury.`;
  }
  if ((phase === "Build" || phase === "Peak") && last < usual * 0.6) {
    return "Last week was much lighter than usual. Fine if planned or if you were ill; otherwise try to get back on track.";
  }
  return null;
}

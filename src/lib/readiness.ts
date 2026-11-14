// "How ready am I today?" score. Pure, no database access.
// Each signal becomes a 0-100 part; the score is their weighted average over
// whatever signals the person actually has (at least two are needed).

export interface ReadinessInput {
  sleepHours: number | null;
  hrv: number | null;
  hrvBaseline: number | null;
  restingHr: number | null;
  restingHrBaseline: number | null;
  tsb: number | null;
  feeling: number | null; // 1-5 check-in
}

export type ReadinessPartKey = "sleep" | "hrv" | "restingHr" | "load" | "feeling";

export interface ReadinessPart {
  key: ReadinessPartKey;
  label: string;
  score: number;
}

export interface Readiness {
  score: number;
  label: string;
  tone: string;
  advice: string;
  parts: ReadinessPart[];
}

const WEIGHTS: Record<ReadinessPartKey, number> = {
  sleep: 0.25,
  hrv: 0.25,
  restingHr: 0.15,
  load: 0.2,
  feeling: 0.15,
};

const LOW_ADVICE: Record<ReadinessPartKey, string> = {
  sleep: "your sleep was short",
  hrv: "your HRV is below your usual",
  restingHr: "your resting heart rate is higher than usual",
  load: "your legs are still tired from recent training",
  feeling: "you don't feel great today",
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function sleepScore(hours: number): number {
  return clamp(15 + ((hours - 4) / 4) * 85);
}

// Same as usual scores 75; 10% above usual is 100, 20% below is 25.
export function hrvScore(hrv: number, baseline: number): number {
  return clamp(75 + (hrv / baseline - 1) * 250);
}

// Same as usual scores 75; every beat per minute above usual costs 10 points.
export function restingHrScore(restingHr: number, baseline: number): number {
  return clamp(75 - (restingHr - baseline) * 10);
}

// Training stress balance (form): fresh is high, deeply fatigued is low.
export function loadScore(tsb: number): number {
  return Math.min(95, clamp(75 + tsb * 2));
}

export function feelingScore(feeling: number): number {
  return clamp((feeling - 1) * 25);
}

export function computeReadiness(input: ReadinessInput): Readiness | null {
  const parts: ReadinessPart[] = [];
  if (input.sleepHours != null && input.sleepHours > 0) {
    parts.push({ key: "sleep", label: "Sleep", score: sleepScore(input.sleepHours) });
  }
  if (input.hrv != null && input.hrvBaseline) {
    parts.push({ key: "hrv", label: "HRV", score: hrvScore(input.hrv, input.hrvBaseline) });
  }
  if (input.restingHr != null && input.restingHrBaseline) {
    parts.push({ key: "restingHr", label: "Resting HR", score: restingHrScore(input.restingHr, input.restingHrBaseline) });
  }
  if (input.tsb != null) parts.push({ key: "load", label: "Training load", score: loadScore(input.tsb) });
  if (input.feeling != null) parts.push({ key: "feeling", label: "Check-in", score: feelingScore(input.feeling) });
  if (parts.length < 2) return null;

  const totalWeight = parts.reduce((sum, p) => sum + WEIGHTS[p.key], 0);
  const score = clamp(parts.reduce((sum, p) => sum + p.score * WEIGHTS[p.key], 0) / totalWeight);
  const low = parts.filter((p) => p.score < 55).sort((a, b) => a.score - b.score).slice(0, 2);
  const because = low.map((p) => LOW_ADVICE[p.key]).join(" and ");

  if (score >= 80) {
    return { score, label: "Ready to go", tone: "bg-good/15 text-good", parts,
      advice: "Everything looks good. A great day for a harder or longer session." };
  }
  if (score >= 60) {
    return { score, label: "Normal day", tone: "bg-accent/15 text-accent", parts,
      advice: because ? `Train as planned, but keep an eye on it: ${because}.` : "Train as planned." };
  }
  if (score >= 40) {
    return { score, label: "Take it easy", tone: "bg-warn/15 text-warn", parts,
      advice: `Keep today easy${because ? `: ${because}` : ""}.` };
  }
  return { score, label: "Rest day", tone: "bg-run/15 text-run", parts,
    advice: `Your body asks for rest${because ? `: ${because}` : ""}. A walk or stretching is plenty.` };
}

export function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

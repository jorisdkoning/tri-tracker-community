// Self-reported "how do I feel" check-in. Pure helpers, no database access.

export const FEELINGS = [
  { value: 1, label: "Wrecked" },
  { value: 2, label: "Tired" },
  { value: 3, label: "OK" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
] as const;

export interface CheckInEntry {
  date: string; // YYYY-MM-DD
  feeling: number; // 1-5
}

export function feelingLabel(value: number): string {
  return FEELINGS.find((f) => f.value === value)?.label ?? "";
}

// Looks at the most recent check-ins (newest first). Several low days in a
// row of answers is a signal worth acting on, whatever the training numbers say.
export function checkInNudge(recent: CheckInEntry[]): string | null {
  const lastFive = recent.slice(0, 5);
  const low = lastFive.filter((e) => e.feeling <= 2).length;
  if (low >= 3) {
    return `You felt tired on ${low} of your last ${lastFive.length} check-ins. Consider an easier day, an earlier night and enough food, and mention it to the Coach.`;
  }
  if (lastFive[0]?.feeling === 1) {
    return "You feel wrecked today. Skipping or shortening today's session is fine.";
  }
  return null;
}

export function averageFeeling(entries: CheckInEntry[]): number | null {
  if (entries.length === 0) return null;
  return Math.round((entries.reduce((sum, e) => sum + e.feeling, 0) / entries.length) * 10) / 10;
}

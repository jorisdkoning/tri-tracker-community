export const DAY_MS = 24 * 60 * 60 * 1000;
// Used until a user picks their own timezone during onboarding.
export const DEFAULT_TIMEZONE = "Europe/Amsterdam";

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

// Monday 00:00 UTC of the week containing `now`.
export function startOfWeekUtc(now: Date): Date {
  const day = (now.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day)
  );
}

// Today's calendar date (YYYY-MM-DD) in the athlete's timezone.
export function localDateString(timeZone: string, now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}

// Monday (YYYY-MM-DD) of the athlete's local week containing `now`.
export function localWeekStartDate(timeZone: string, now: Date = new Date()): string {
  const today = new Date(`${localDateString(timeZone, now)}T00:00:00Z`);
  const offset = (today.getUTCDay() + 6) % 7; // Monday = 0
  return new Date(today.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

// Hour of day (0-23) in the athlete's timezone.
export function localHour(timeZone: string, now: Date = new Date()): number {
  return Number(now.toLocaleString("en-GB", { timeZone, hour: "numeric", hour12: false })) % 24;
}

export function isValidTimezone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

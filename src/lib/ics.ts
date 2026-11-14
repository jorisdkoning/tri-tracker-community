import { DAY_MS, DEFAULT_TIMEZONE } from "@/lib/time";

const DEFAULT_DURATION_SEC = 3600;

export interface CalendarWorkout {
  externalId: string;
  date: Date;
  startTime: string | null; // "HH:mm" wall-clock time in the athlete's timezone
  durationSec: number | null;
  name: string;
  description: string | null;
}

export interface CalendarRace {
  id: string;
  date: Date;
  name: string;
}

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// iCalendar lines must be folded at 75 octets; fold on characters with margin.
export function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 70) {
    parts.push(rest.slice(0, 70));
    rest = " " + rest.slice(70);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function allDay(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function zonedParts(instant: Date, locale: string, withSeconds: boolean, timeZone: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hourCycle: "h23",
  }).formatToParts(instant);
}

function localOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, "en-US", true, timeZone);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  const asLocal = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asLocal - instant.getTime();
}

function localStamp(instant: Date, timeZone: string): string {
  const parts = zonedParts(instant, "en-CA", false, timeZone);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// `time` is wall-clock time in the athlete's timezone (intervals.icu local
// event times). Convert it to the real UTC instant so calendar apps land the
// event at the right local time. During the autumn repeated hour two instants
// map to the same local time; take the earliest so the event isn't an hour late.
export function localToUtc(day: string, time: string, timeZone: string = DEFAULT_TIMEZONE): Date {
  const guess = new Date(`${day}T${time}:00Z`);
  const hour = 60 * 60 * 1000;
  const candidates = [-2 * hour, 0, 2 * hour].map(
    (delta) => new Date(guess.getTime() - localOffsetMs(new Date(guess.getTime() + delta), timeZone))
  );
  const wanted = `${day} ${time}`;
  const matches = candidates.filter((c) => localStamp(c, timeZone) === wanted).map((c) => c.getTime());
  // Spring-forward times don't exist locally; fall back to the first guess.
  return new Date(matches.length ? Math.min(...matches) : candidates[1].getTime());
}

export function buildCalendar(
  workouts: CalendarWorkout[],
  races: CalendarRace[],
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date()
): string {
  const stamp = utcStamp(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tri Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tri Tracker",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const workout of workouts) {
    const day = workout.date.toISOString().slice(0, 10);
    lines.push("BEGIN:VEVENT", `UID:workout-${workout.externalId}@tri-tracker`, `DTSTAMP:${stamp}`);
    if (workout.startTime) {
      const start = localToUtc(day, workout.startTime, timeZone);
      const end = new Date(start.getTime() + (workout.durationSec ?? DEFAULT_DURATION_SEC) * 1000);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`);
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${allDay(workout.date)}`,
        `DTEND;VALUE=DATE:${allDay(new Date(workout.date.getTime() + DAY_MS))}`
      );
    }
    lines.push(`SUMMARY:${escapeText(workout.name)}`);
    if (workout.description) lines.push(`DESCRIPTION:${escapeText(workout.description)}`);
    if (workout.startTime) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(workout.name)}`,
        "TRIGGER:-PT60M",
        "END:VALARM"
      );
    }
    lines.push("END:VEVENT");
  }

  for (const race of races) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:race-${race.id}@tri-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${allDay(race.date)}`,
      `DTEND;VALUE=DATE:${allDay(new Date(race.date.getTime() + DAY_MS))}`,
      `SUMMARY:${escapeText(`Race: ${race.name}`)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

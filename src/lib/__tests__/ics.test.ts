import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, localToUtc } from "@/lib/ics";

describe("escapeText", () => {
  it("escapes backslashes, semicolons, commas and newlines", () => {
    expect(escapeText("a;b,c\\d\ne")).toBe("a\;b\\,c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("keeps every physical line within 75 characters and unfolds to the original", () => {
    const original = "DESCRIPTION:" + "word ".repeat(60);
    const folded = foldLine(original);
    for (const physical of folded.split("\r\n")) expect(physical.length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(original);
  });
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Run")).toBe("SUMMARY:Run");
  });
});

describe("localToUtc (Europe/Amsterdam)", () => {
  it("converts winter time (UTC+1)", () => {
    expect(localToUtc("2026-11-02", "18:00").toISOString()).toBe("2026-11-02T17:00:00.000Z");
  });
  it("converts summer time (UTC+2)", () => {
    expect(localToUtc("2026-07-15", "18:00").toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });
  it("takes the earlier instant in the repeated autumn hour", () => {
    expect(localToUtc("2026-10-25", "02:30").toISOString()).toBe("2026-10-25T00:30:00.000Z");
  });
  it("still returns a valid time for a spring-forward time that does not exist", () => {
    const result = localToUtc("2027-03-28", "02:30");
    expect(Number.isNaN(result.getTime())).toBe(false);
    expect(Math.abs(result.getTime() - Date.parse("2027-03-28T02:30:00Z"))).toBeLessThanOrEqual(2 * 3600_000);
  });
});

describe("buildCalendar", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const workout = {
    externalId: "123",
    date: new Date("2026-11-02"),
    startTime: "18:00",
    durationSec: 2700,
    name: "Run: easy",
    description: "Easy, conversational pace; walk if needed",
  };

  it("builds a valid calendar with CRLF line endings", () => {
    const ics = buildCalendar([workout], [], "Europe/Amsterdam", now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
  });
  it("places a timed workout at the right UTC time with a reminder", () => {
    const ics = buildCalendar([workout], [], "Europe/Amsterdam", now);
    expect(ics).toContain("UID:workout-123@tri-tracker");
    expect(ics).toContain("DTSTART:20261102T170000Z");
    expect(ics).toContain("DTEND:20261102T174500Z");
    expect(ics).toContain("TRIGGER:-PT60M");
    expect(ics).toContain("Easy\\, conversational pace\; walk if needed");
  });
  it("makes an all-day event without reminder when there is no start time", () => {
    const ics = buildCalendar([{ ...workout, startTime: null }], [], "Europe/Amsterdam", now);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261102");
    expect(ics).toContain("DTEND;VALUE=DATE:20261103");
    expect(ics).not.toContain("VALARM");
  });
  it("adds races as all-day events", () => {
    const ics = buildCalendar([], [{ id: "r1", date: new Date("2027-09-04"), name: "Olympic, Amsterdam" }], "Europe/Amsterdam", now);
    expect(ics).toContain("UID:race-r1@tri-tracker");
    expect(ics).toContain("SUMMARY:Race: Olympic\\, Amsterdam");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270904");
  });
});

describe("localToUtc (other timezones)", () => {
  it("converts New York summer time (UTC-4)", () => {
    expect(localToUtc("2026-07-15", "18:00", "America/New_York").toISOString()).toBe("2026-07-15T22:00:00.000Z");
  });
  it("converts Sydney winter time (UTC+10)", () => {
    expect(localToUtc("2026-07-15", "06:00", "Australia/Sydney").toISOString()).toBe("2026-07-14T20:00:00.000Z");
  });
});

import { describe, expect, it } from "vitest";
import { COACH_INSTRUCTIONS, coachMarkdown } from "../coach-prompt";

describe("coachMarkdown", () => {
  const base = {
    appName: "FitLog",
    generatedAt: new Date("2026-11-14T23:30:00Z"),
    timeZone: "Europe/Amsterdam",
    context: "## Training\n- 3 runs this week\n",
  };

  it("contains the instructions, the data and the local export date", () => {
    const md = coachMarkdown({ ...base, name: "Sam" });
    expect(md.startsWith("# Sam's FitLog summary")).toBe(true);
    expect(md).toContain(COACH_INSTRUCTIONS);
    expect(md).toContain("- 3 runs this week");
    expect(md).toContain("15 November 2026");
  });

  it("falls back to a neutral title without a name", () => {
    expect(coachMarkdown({ ...base, name: null }).startsWith("# My FitLog summary")).toBe(true);
  });
});

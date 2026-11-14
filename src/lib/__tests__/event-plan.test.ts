import { describe, expect, it } from "vitest";
import { eventPlan, phaseFor, volumeWarning } from "../event-plan";

describe("phaseFor", () => {
  it("tapers longer for longer events", () => {
    expect(phaseFor(0, "SPRINT")).toBe("Event week");
    expect(phaseFor(2, "SPRINT")).toBe("Peak");
    expect(phaseFor(2, "IRONMAN")).toBe("Taper");
    expect(phaseFor(10, "OLYMPIC")).toBe("Build");
    expect(phaseFor(20, "OLYMPIC")).toBe("Base");
  });
});

describe("eventPlan", () => {
  it("counts weeks out and builds the timeline", () => {
    const plan = eventPlan(3, "OTHER", []);
    expect(plan.weeksOut).toBe(0);
    expect(plan.phase).toBe("Event week");
    const far = eventPlan(70, "HALF_IRONMAN", []);
    expect(far.weeksOut).toBe(10);
    expect(far.weeks).toHaveLength(11);
    expect(far.weeks.at(-1)?.phase).toBe("Event week");
  });
});

describe("volumeWarning", () => {
  it("warns about ramping too fast", () => {
    expect(volumeWarning("Build", [5, 5, 5, 7])).toContain("40%");
    expect(volumeWarning("Build", [5, 5, 5, 5.4])).toBeNull();
  });

  it("asks to cut back during the taper", () => {
    expect(volumeWarning("Taper", [6, 6, 6, 6])).toContain("Cut back");
    expect(volumeWarning("Taper", [6, 6, 6, 4])).toBeNull();
  });

  it("needs enough history", () => {
    expect(volumeWarning("Build", [1, 10])).toBeNull();
  });
});

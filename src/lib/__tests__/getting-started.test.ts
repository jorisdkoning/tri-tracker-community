import { describe, expect, it } from "vitest";
import { gettingStartedSteps } from "../getting-started";

const none = { hasConnection: false, hasWorkout: false, hasCheckIn: false, hasEventOrGoal: false, hasMeal: false };

describe("gettingStartedSteps", () => {
  it("lists every step as open for a new user", () => {
    const steps = gettingStartedSteps(none);
    expect(steps).toHaveLength(5);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("marks the steps that are done", () => {
    const steps = gettingStartedSteps({ ...none, hasWorkout: true, hasMeal: true });
    expect(steps.filter((s) => s.done).map((s) => s.id)).toEqual(["hasWorkout", "hasMeal"]);
  });
});

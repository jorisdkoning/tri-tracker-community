import { afterEach, describe, expect, it } from "vitest";
import { matchesEnvSecret, safeEqual } from "@/lib/secrets";

describe("safeEqual", () => {
  it("matches equal strings only", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("matchesEnvSecret", () => {
  const NAME = "TEST_SECRET_FOR_VITEST";
  afterEach(() => {
    delete process.env[NAME];
  });

  it("matches the configured secret", () => {
    process.env[NAME] = "x".repeat(40);
    expect(matchesEnvSecret("x".repeat(40), NAME)).toBe(true);
    expect(matchesEnvSecret("y".repeat(40), NAME)).toBe(false);
  });
  it("fails closed when the secret is missing or too short", () => {
    expect(matchesEnvSecret("anything", NAME)).toBe(false);
    process.env[NAME] = "short";
    expect(matchesEnvSecret("short", NAME)).toBe(false);
    expect(matchesEnvSecret("short", NAME, 4)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { signupDecision, signupSchema } from "@/lib/signup-rules";

const now = new Date("2026-11-14T12:00:00Z");
const fresh = { usedAt: null, expiresAt: new Date("2026-11-20T00:00:00Z") };

describe("signupDecision", () => {
  it("always lets the first account in, even when closed", () => {
    expect(signupDecision("CLOSED", 0, null, now).ok).toBe(true);
  });
  it("allows anyone when open", () => {
    expect(signupDecision("OPEN", 5, null, now).ok).toBe(true);
  });
  it("blocks everyone when closed", () => {
    expect(signupDecision("CLOSED", 5, fresh, now).ok).toBe(false);
  });
  it("needs a valid invite in invite mode", () => {
    expect(signupDecision("INVITE", 5, null, now).ok).toBe(false);
    expect(signupDecision("INVITE", 5, fresh, now).ok).toBe(true);
    expect(signupDecision("INVITE", 5, { ...fresh, usedAt: now }, now).ok).toBe(false);
    expect(signupDecision("INVITE", 5, { usedAt: null, expiresAt: now }, now).ok).toBe(false);
  });
});

describe("signupSchema", () => {
  it("normalises email and rejects short passwords", () => {
    const ok = signupSchema.safeParse({ name: "An", email: " An@Example.COM ", password: "longenough" });
    expect(ok.success && ok.data.email).toBe("an@example.com");
    expect(signupSchema.safeParse({ name: "An", email: "a@b.co", password: "short" }).success).toBe(false);
  });
});

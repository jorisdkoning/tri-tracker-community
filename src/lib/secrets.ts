import { timingSafeEqual } from "node:crypto";

// Constant-time compare. Length is checked first because timingSafeEqual
// requires equal lengths; the length of a fixed-format secret isn't itself secret.
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// True when `provided` equals the secret stored in env var `envName`. A missing
// or short secret never matches, so a misconfigured deployment fails closed.
export function matchesEnvSecret(provided: string, envName: string, minLength = 32): boolean {
  const expected = process.env[envName];
  if (!expected || expected.length < minLength) return false;
  return safeEqual(provided, expected);
}

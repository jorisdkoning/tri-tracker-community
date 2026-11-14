import { createHash, randomBytes } from "node:crypto";
import type { LinkKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// The user's secret link token for `kind`, created on first use.
export async function getOrCreateLinkToken(userId: string, kind: LinkKind): Promise<string> {
  const existing = await prisma.personalLink.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (existing) return decrypt(existing.tokenEnc);
  return rotateLinkToken(userId, kind);
}

// Replaces the link, so anyone holding the old URL loses access.
export async function rotateLinkToken(userId: string, kind: LinkKind): Promise<string> {
  const token = generateToken();
  const data = { tokenHash: hashToken(token), tokenEnc: encrypt(token) };
  await prisma.personalLink.upsert({
    where: { userId_kind: { userId, kind } },
    update: { ...data, createdAt: new Date() },
    create: { userId, kind, ...data },
  });
  return token;
}

// Resolves a token from a URL to its owner, or null. Lookup is by hash, which
// is a fixed-length exact match, so there is no partial-match timing leak.
export async function findUserByLinkToken(kind: LinkKind, token: string) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const link = await prisma.personalLink.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { kind: true, user: { select: { id: true, timezone: true } } },
  });
  return link && link.kind === kind ? link.user : null;
}

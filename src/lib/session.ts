import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// For server actions: the signed-in user's id, or throw.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  timezone: true,
  weightKg: true,
  currency: true,
  showFodmap: true,
  onboardedAt: true,
  isAdmin: true,
  passwordHash: true,
} as const;

export type CurrentUser = Awaited<ReturnType<typeof loadUser>>;

async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

// The signed-in user's profile, deduplicated per request. A JWT can outlive a
// deleted account, so a missing row sends the visitor back to the login page.
export const requireUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  const user = await loadUser(id);
  if (!user) redirect("/login?error=AccountGone");
  return user;
});

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/");
  return user;
}

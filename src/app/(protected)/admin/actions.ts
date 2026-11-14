"use server";

import { revalidatePath } from "next/cache";
import type { SignupMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { setSignupMode } from "@/lib/accounts";
import { createInvite } from "@/lib/admin";
import { createPasswordResetToken } from "@/lib/password-reset";
import { getBaseUrl } from "@/lib/base-url";

const MODES: SignupMode[] = ["OPEN", "INVITE", "CLOSED"];

export async function setSignupModeAction(formData: FormData) {
  await requireAdmin();
  const mode = String(formData.get("mode")) as SignupMode;
  if (!MODES.includes(mode)) throw new Error("Unknown mode");
  await setSignupMode(mode);
  revalidatePath("/admin");
}

export async function createInviteAction(formData: FormData) {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim().slice(0, 80) || null;
  await createInvite(admin.id, note);
  revalidatePath("/admin");
}

export async function deleteInviteAction(formData: FormData) {
  await requireAdmin();
  await prisma.invite.deleteMany({ where: { id: String(formData.get("id")) } });
  revalidatePath("/admin");
}

export type ResetLinkState = { url?: string; error?: string } | undefined;

export async function resetLinkAction(_prev: ResetLinkState, formData: FormData): Promise<ResetLinkState> {
  await requireAdmin();
  const userId = String(formData.get("userId"));
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return { error: "User not found" };
  const token = await createPasswordResetToken(userId);
  return { url: `${await getBaseUrl()}/reset/${token}` };
}

export async function setAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  const makeAdmin = formData.get("makeAdmin") === "1";
  if (userId === admin.id && !makeAdmin) throw new Error("You can't remove your own admin rights");
  await prisma.user.update({ where: { id: userId }, data: { isAdmin: makeAdmin } });
  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId"));
  if (userId === admin.id) throw new Error("Delete your own account from Settings instead");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
}

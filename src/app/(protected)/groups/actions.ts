"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { generateToken } from "@/lib/tokens";
import { cleanJoinCode, MAX_GROUPS_CREATED, MAX_MEMBERS } from "@/lib/groups";

const displayName = z.string().trim().min(1).max(40);

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  metric: z.enum(["ACTIVE_MINUTES", "WORKOUTS", "DISTANCE", "CHECKINS"]),
  displayName,
});

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/groups?error=invalid");
  const created = await prisma.group.count({ where: { createdById: user.id } });
  if (created >= MAX_GROUPS_CREATED) redirect("/groups?error=limit");
  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      metric: parsed.data.metric,
      joinCode: generateToken(9),
      createdById: user.id,
      members: { create: { userId: user.id, displayName: parsed.data.displayName } },
    },
  });
  redirect(`/groups/${group.id}`);
}

export async function joinGroup(formData: FormData) {
  const user = await requireUser();
  const code = cleanJoinCode(String(formData.get("code") ?? ""));
  const name = displayName.safeParse(formData.get("displayName"));
  if (!code || !name.success) redirect("/groups?error=invalid");
  const group = await prisma.group.findUnique({
    where: { joinCode: code },
    select: { id: true, _count: { select: { members: true } } },
  });
  if (!group) redirect("/groups?error=notfound");
  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    select: { userId: true },
  });
  if (!already) {
    if (group._count.members >= MAX_MEMBERS) redirect("/groups?error=full");
    await prisma.groupMember.create({ data: { groupId: group.id, userId: user.id, displayName: name.data } });
  }
  redirect(`/groups/${group.id}`);
}

export async function leaveGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("id") ?? "");
  await prisma.groupMember.deleteMany({ where: { groupId, userId: user.id } });
  if ((await prisma.groupMember.count({ where: { groupId } })) === 0) {
    await prisma.group.deleteMany({ where: { id: groupId } });
  }
  redirect("/groups");
}

export async function deleteGroup(formData: FormData) {
  const user = await requireUser();
  await prisma.group.deleteMany({ where: { id: String(formData.get("id") ?? ""), createdById: user.id } });
  redirect("/groups");
}

export async function newJoinCode(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  await prisma.group.updateMany({ where: { id, createdById: user.id }, data: { joinCode: generateToken(9) } });
  revalidatePath(`/groups/${id}`);
}

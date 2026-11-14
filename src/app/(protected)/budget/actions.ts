"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { requireUserId } from "@/lib/session";
const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  amount: z.coerce.number().positive("Amount must be positive"),
  category: z.enum([
    "GEAR",
    "RACE_ENTRY",
    "COACHING",
    "NUTRITION",
    "TRAVEL",
    "OTHER",
  ]),
  note: z.string().trim().max(200).optional(),
  raceId: z.string().trim().optional(),
});

export async function addExpense(formData: FormData) {
  const userId = await requireUserId();

  const parsed = expenseSchema.parse({
    date: formData.get("date"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    note: formData.get("note") || undefined,
    raceId: formData.get("raceId") || undefined,
  });

  if (parsed.raceId) {
    const race = await prisma.race.findFirst({
      where: { id: parsed.raceId, userId },
      select: { id: true },
    });
    if (!race) throw new Error("Race not found");
  }

  await prisma.expense.create({
    data: {
      userId,
      date: new Date(parsed.date),
      amount: parsed.amount,
      category: parsed.category,
      note: parsed.note ?? null,
      raceId: parsed.raceId || null,
    },
  });

  revalidatePath("/budget");
  revalidatePath("/");
}

export async function deleteExpense(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing expense id");

  // Scope the delete to the current user so an id can't delete others' rows
  await prisma.expense.deleteMany({ where: { id, userId } });

  revalidatePath("/budget");
  revalidatePath("/");
}

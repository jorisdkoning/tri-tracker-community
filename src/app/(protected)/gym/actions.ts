"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

import { requireUserId } from "@/lib/session";
// Gym sessions arrive only via Apple Health import (RepCount -> Apple Health
// -> Health Auto Export -> /api/ingest/health). This is just cleanup for a
// bad import.
export async function deleteGymSession(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing session id");

  await prisma.gymSession.deleteMany({ where: { id, userId } });

  revalidatePath("/gym");
}

const notesSchema = z.object({
  id: z.string().min(1),
  notes: z.string().trim().max(120),
});

export type NotesState =
  | { status: "idle" }
  | { status: "saved"; notes: string }
  | { status: "error"; message: string };

// RepCount's own session title/exercise detail doesn't make it into Apple
// Health, so the imported session has no label beyond "strength training" -
// this lets you tag it yourself (e.g. "Legs"). Returns a state (instead of
// returning nothing) so the form can confirm the save or show what went wrong.
export async function saveGymSessionNotes(
  _prevState: NotesState,
  formData: FormData
): Promise<NotesState> {
  try {
    const userId = await requireUserId();
    const parsed = notesSchema.parse({
      id: formData.get("id"),
      notes: formData.get("notes") ?? "",
    });

    const { count } = await prisma.gymSession.updateMany({
      where: { id: parsed.id, userId },
      data: { notes: parsed.notes || null },
    });
    if (count === 0) return { status: "error", message: "Session not found" };

    revalidatePath("/gym");
    revalidatePath("/training");
    revalidatePath("/");
    return { status: "saved", notes: parsed.notes };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof z.ZodError
          ? "The label can be at most 120 characters"
          : "Could not save, please try again",
    };
  }
}

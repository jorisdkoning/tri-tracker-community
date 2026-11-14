"use client";

import { useActionState, useState } from "react";
import { saveGymSessionNotes, type NotesState } from "./actions";

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes);

  const [state, formAction, pending] = useActionState<NotesState, FormData>(
    async (previous, formData) => {
      const result = await saveGymSessionNotes(previous, formData);
      if (result.status === "saved") setEditing(false);
      return result;
    },
    { status: "idle" }
  );

  // Right after a save, show what was saved even before the page refetches.
  const savedLabel = state.status === "saved" ? state.notes : notes;
  const showLabel = savedLabel !== "" && !editing;

  if (showLabel) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm">{savedLabel}</p>
          {state.status === "saved" && <p className="text-xs text-good">Saved</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            setValue(savedLabel);
            setEditing(true);
          }}
          className="rounded-md bg-foreground/[0.06] px-3 py-1 text-sm font-medium"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-1">
      <div className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input
          type="text"
          name="notes"
          maxLength={120}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Label this session (e.g. Legs)"
          className="flex-1 rounded-md border border-line bg-transparent px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground/[0.06] px-3 py-1 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {savedLabel !== "" && (
          <button
            type="button"
            onClick={() => {
              setValue(savedLabel);
              setEditing(false);
            }}
            className="px-2 py-1 text-sm text-foreground/60"
          >
            Cancel
          </button>
        )}
      </div>
      {state.status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.message}</p>
      )}
    </form>
  );
}

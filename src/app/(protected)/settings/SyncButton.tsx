"use client";

import { useActionState } from "react";
import { syncIntervalsAction, type SyncActionState } from "./actions";

const initialState: SyncActionState = { status: "idle" };

export function SyncButton() {
  const [state, formAction, isPending] = useActionState(
    syncIntervalsAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Syncing…" : "Sync now"}
      </button>

      {state.status === "success" && (
        <p className="text-sm text-foreground/70">
          Synced {state.activities} activities and {state.wellnessDays} days
          of wellness data.
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}

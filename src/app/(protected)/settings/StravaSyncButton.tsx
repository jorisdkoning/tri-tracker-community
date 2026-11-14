"use client";

import { useActionState } from "react";
import { syncStravaAction, type StravaSyncActionState } from "./actions";

const initialState: StravaSyncActionState = { status: "idle" };

export function StravaSyncButton() {
  const [state, formAction, isPending] = useActionState(
    syncStravaAction,
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
          Synced {state.activities} activities from Strava.
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

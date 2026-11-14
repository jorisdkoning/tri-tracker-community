"use client";

import { useActionState } from "react";
import { connectIntervalsAction } from "./actions";
import { FormStatus } from "./FormStatus";

export function IntervalsForm() {
  const [state, action, pending] = useActionState(connectIntervalsAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Paste your API key here</span>
        <input name="apiKey" type="password" required autoComplete="off" className="field max-w-md" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Checking the key…" : "Connect Intervals.icu"}
        </button>
        <FormStatus state={state} savedText="Connected" />
      </div>
    </form>
  );
}

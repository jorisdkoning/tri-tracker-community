"use client";

import { useActionState } from "react";
import { connectClaudeKeyAction } from "./actions";
import { FormStatus } from "./FormStatus";

export function ClaudeKeyForm() {
  const [state, action, pending] = useActionState(connectClaudeKeyAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Paste your Claude key here</span>
        <input name="apiKey" type="password" required autoComplete="off" placeholder="sk-ant-…" className="field max-w-md" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Checking the key…" : "Save key"}
        </button>
        <FormStatus state={state} savedText="Saved" />
      </div>
    </form>
  );
}

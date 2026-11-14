"use client";

import { useActionState } from "react";
import { resetLinkAction } from "./actions";
import { CopyField } from "../settings/CopyField";

export function ResetLinkButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetLinkAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      {state?.url ? (
        <>
          <CopyField value={state.url} />
          <p className="text-xs text-foreground/55">Send this link to them. It works once, for 2 days.</p>
        </>
      ) : (
        <button type="submit" disabled={pending} className="text-xs text-accent hover:underline">
          {pending ? "Making link…" : "Password reset link"}
        </button>
      )}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

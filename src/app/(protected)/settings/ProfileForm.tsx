"use client";

import { useActionState } from "react";
import { saveProfileAction } from "./actions";
import { FormStatus } from "./FormStatus";

export function ProfileForm({ children }: { children: React.ReactNode }) {
  const [state, action, pending] = useActionState(saveProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {children}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save"}
        </button>
        <FormStatus state={state} savedText="Saved" />
      </div>
    </form>
  );
}

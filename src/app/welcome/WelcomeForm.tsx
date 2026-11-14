"use client";

import { useActionState, useEffect, useRef } from "react";
import { finishWelcomeAction } from "./actions";

export function WelcomeForm({ children, detectTimezone }: { children: React.ReactNode; detectTimezone: boolean }) {
  const [state, action, pending] = useActionState(finishWelcomeAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Google sign-ups never told us their timezone; take the phone's setting.
  useEffect(() => {
    if (!detectTimezone) return;
    const select = formRef.current?.elements.namedItem("timezone");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (select instanceof HTMLSelectElement && [...select.options].some((o) => o.value === tz)) select.value = tz;
  }, [detectTimezone]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {children}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

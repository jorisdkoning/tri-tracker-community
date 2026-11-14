"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../../actions";
import { Field, FormError } from "../../_components/FormMessage";
import { MIN_PASSWORD_LENGTH } from "@/lib/signup-rules";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`} />
      <Field label="Type it again" name="confirm" type="password" autoComplete="new-password" required />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

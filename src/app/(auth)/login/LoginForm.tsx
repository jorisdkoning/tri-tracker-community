"use client";

import { useActionState } from "react";
import { signInAction } from "../actions";
import { Field, FormError } from "../_components/FormMessage";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(signInAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error ?? initialError} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

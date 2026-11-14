"use client";

import { useActionState, useRef } from "react";
import { signUpAction } from "../actions";
import { Field, FormError } from "../_components/FormMessage";
import { MIN_PASSWORD_LENGTH } from "@/lib/signup-rules";

export function SignupForm({ invite }: { invite?: string }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const timezoneRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action={action}
      onSubmit={() => {
        if (timezoneRef.current) timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }}
      className="space-y-4"
    >
      <FormError message={state?.error} />
      {invite && <input type="hidden" name="invite" value={invite} />}
      <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="" />
      <Field label="Your name" name="name" autoComplete="given-name" required maxLength={80} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Choose a password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating your account…" : "Create account"}
      </button>
    </form>
  );
}

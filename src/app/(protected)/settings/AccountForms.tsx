"use client";

import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction } from "./actions";
import { FormStatus } from "./FormStatus";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-3">
      {hasPassword && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Current password</span>
          <input name="current" type="password" autoComplete="current-password" required className="field max-w-sm" />
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-sm font-medium">{hasPassword ? "New password" : "Choose a password"}</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className="field max-w-sm" />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-secondary">
          {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </button>
        <FormStatus state={state} savedText="Password saved" />
      </div>
    </form>
  );
}

export function DeleteAccountForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, undefined);
  return (
    <details className="rounded-lg border border-red-500/30 p-4">
      <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400">
        Delete my account and all my data
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-sm text-foreground/70">
          This removes everything: workouts, health data, meals, races and connections. It cannot be undone.
          Type <b>{email}</b> to confirm.
        </p>
        <input name="confirmEmail" autoComplete="off" required className="field max-w-sm" />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Deleting…" : "Delete forever"}
          </button>
          <FormStatus state={state} savedText="" />
        </div>
      </form>
    </details>
  );
}

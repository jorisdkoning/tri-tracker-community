"use client";

import { useActionState, useState } from "react";
import { logBodyAction, logWorkoutAction, type LogState } from "./actions";

function Status({ state, savedText }: { state: LogState; savedText: string }) {
  if (state?.error) return <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state?.saved) return <p className="text-sm text-good">{savedText}</p>;
  return null;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="card group p-0">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium">
        {title}
        <span className="text-accent transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

const lbl = "block space-y-1";
const txt = "text-sm font-medium";

export function LogWorkoutForm({ today, defaultKind = "RUN" }: { today: string; defaultKind?: string }) {
  const [state, action, pending] = useActionState(logWorkoutAction, undefined);
  const [kind, setKind] = useState(defaultKind);
  return (
    <Panel title="Add a workout by hand">
      <form action={action} className="space-y-4">
        <p className="text-sm text-foreground/60">For workouts that didn&apos;t come in from Strava, Intervals.icu or your watch.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={lbl}>
            <span className={txt}>What did you do?</span>
            <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="field">
              <option value="RUN">Run</option>
              <option value="BIKE">Bike</option>
              <option value="SWIM">Swim</option>
              <option value="GYM">Gym / strength</option>
              <option value="OTHER">Something else</option>
            </select>
          </label>
          <label className={lbl}>
            <span className={txt}>Date</span>
            <input name="date" type="date" defaultValue={today} max={today} required className="field" />
          </label>
          <label className={lbl}>
            <span className={txt}>Minutes</span>
            <input name="minutes" type="number" inputMode="numeric" min={1} required placeholder="45" className="field" />
          </label>
          {kind !== "GYM" && (
            <label className={lbl}>
              <span className={txt}>Distance in km (optional)</span>
              <input name="distanceKm" inputMode="decimal" placeholder="10" className="field" />
            </label>
          )}
          <label className={`${lbl} sm:col-span-2`}>
            <span className={txt}>Name or note (optional)</span>
            <input name="name" maxLength={80} placeholder={kind === "GYM" ? "e.g. Leg day" : "e.g. Easy run in the park"} className="field" />
          </label>
        </div>
        {kind === "GYM" && <input type="hidden" name="distanceKm" value="" />}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save workout"}
          </button>
          <Status state={state} savedText="Saved! Add another or close this box." />
        </div>
      </form>
    </Panel>
  );
}

export function LogBodyForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(logBodyAction, undefined);
  return (
    <Panel title="Add weight, sleep or resting heart rate by hand">
      <form action={action} className="space-y-4">
        <p className="text-sm text-foreground/60">Fill in only what you know. Leave the rest empty.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className={lbl}>
            <span className={txt}>Date</span>
            <input name="date" type="date" defaultValue={today} max={today} required className="field" />
          </label>
          <label className={lbl}>
            <span className={txt}>Weight (kg)</span>
            <input name="weightKg" inputMode="decimal" placeholder="70.5" className="field" />
          </label>
          <label className={lbl}>
            <span className={txt}>Sleep (hours)</span>
            <input name="sleepHours" inputMode="decimal" placeholder="7.5" className="field" />
          </label>
          <label className={lbl}>
            <span className={txt}>Resting heart rate</span>
            <input name="restingHr" inputMode="numeric" placeholder="52" className="field" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Save"}
          </button>
          <Status state={state} savedText="Saved!" />
        </div>
      </form>
    </Panel>
  );
}

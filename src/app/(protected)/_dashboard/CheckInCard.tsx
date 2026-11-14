"use client";

import { useState, useTransition } from "react";
import { FEELINGS, feelingLabel, type CheckInEntry } from "@/lib/checkin";
import { saveCheckIn } from "./actions";

const DOT_COLOR: Record<number, string> = {
  1: "bg-run",
  2: "bg-warn",
  3: "bg-foreground/30",
  4: "bg-accent",
  5: "bg-good",
};

export function CheckInCard({
  today,
  recent,
  nudge,
}: {
  today: number | null;
  recent: CheckInEntry[];
  nudge: string | null;
}) {
  const [selected, setSelected] = useState<number | null>(today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(value: number) {
    setSelected(value);
    setError(null);
    startTransition(async () => {
      try {
        await saveCheckIn(value);
      } catch {
        setSelected(today);
        setError("Could not save, please try again.");
      }
    });
  }

  return (
    <div id="check-in" className="card space-y-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground/60">How do you feel today?</p>
        {selected != null && (
          <p className="text-xs text-foreground/50">
            {pending ? "Saving…" : `Saved: ${feelingLabel(selected)}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {FEELINGS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => choose(f.value)}
            aria-pressed={selected === f.value}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
              selected === f.value
                ? "border-foreground bg-foreground text-background"
                : "border-line hover:bg-foreground/[0.05]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs text-foreground/50">Last days</span>
          {[...recent].reverse().map((e) => (
            <span
              key={e.date}
              title={`${e.date}: ${feelingLabel(e.feeling)}`}
              className={`h-2.5 w-2.5 rounded-full ${DOT_COLOR[e.feeling] ?? "bg-foreground/30"}`}
            />
          ))}
        </div>
      )}

      {nudge && <p className="text-sm text-warn">{nudge}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

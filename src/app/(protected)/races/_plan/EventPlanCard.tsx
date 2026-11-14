import type { EventPlan, Phase } from "@/lib/event-plan";

const PHASE_COLOR: Record<Phase, string> = {
  Base: "bg-foreground/25",
  Build: "bg-accent",
  Peak: "bg-run",
  Taper: "bg-good",
  "Event week": "bg-warn",
};

export function EventPlanCard({ name, plan }: { name: string; plan: EventPlan }) {
  const phases = [...new Set(plan.weeks.map((w) => w.phase))];
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground/60">Your plan for {name}</p>
          <p className="text-2xl font-semibold">{plan.phase}</p>
        </div>
        <p className="text-right text-sm text-foreground/60">
          {plan.weeksOut === 0 ? "This week!" : `${plan.weeksOut} week${plan.weeksOut === 1 ? "" : "s"} to go`}
        </p>
      </div>
      <p className="text-sm">{plan.advice}</p>
      <div>
        <div className="flex gap-1" aria-label="Weeks until the event">
          {plan.weeks.map((week) => (
            <div
              key={week.weeksOut}
              title={`${week.weeksOut === 0 ? "This week" : `${week.weeksOut} week${week.weeksOut === 1 ? "" : "s"} out`}: ${week.phase}`}
              className={`h-3 flex-1 rounded-sm ${PHASE_COLOR[week.phase]} ${week.weeksOut === plan.weeksOut ? "ring-2 ring-foreground ring-offset-1" : "opacity-70"}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-foreground/60">
          {phases.map((phase) => (
            <span key={phase} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-sm ${PHASE_COLOR[phase]}`} />
              {phase}
            </span>
          ))}
        </div>
      </div>
      {plan.lastWeekHours != null && (
        <p className="text-sm text-foreground/70">Last week you trained {plan.lastWeekHours} h.</p>
      )}
      {plan.warning && <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">{plan.warning}</p>}
    </section>
  );
}

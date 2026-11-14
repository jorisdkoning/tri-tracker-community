import Link from "next/link";
import { formatPaceSeconds } from "@/lib/goals";
import type { DashboardData } from "@/lib/dashboard-data";

export function GoalsCard({ goals }: { goals: DashboardData["goals"] }) {
  return (
    <Link
      href="/goals"
      className="card block space-y-3 p-5 hover:bg-foreground/[0.03] md:col-span-2"
    >
      <p className="text-sm font-medium text-foreground/60">Goals</p>
      {goals.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Set a target (cycling speed, swim or run pace, weight) to track progress here.
        </p>
      ) : (
        goals.map((goal) => {
          const pct = Math.round((goal.progress.pct ?? 0) * 100);
          const unit = goal.progress.unit.replace(/^s\//, "/");
          const isPace = goal.metric.includes("PACE");
          const fmt = (value: number) => (isPace ? formatPaceSeconds(value) : String(value));
          return (
            <div key={goal.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{goal.label}</span>
                <span className="shrink-0 tabular-nums text-foreground/60">
                  {goal.progress.currentValue != null ? fmt(goal.progress.currentValue) : "—"} →{" "}
                  {fmt(goal.targetValue)} {unit}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })
      )}
    </Link>
  );
}

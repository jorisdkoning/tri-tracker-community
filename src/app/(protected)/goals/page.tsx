import type { GoalMetric } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeGoalProgress, formatPaceSeconds } from "@/lib/goals";
import { addGoal, deleteGoal } from "./actions";

const METRIC_LABELS: Record<GoalMetric, string> = {
  CYCLING_SPEED_KMH: "Cycling speed (km/h)",
  SWIM_PACE_SEC_PER_100M: "Swim pace (sec/100m)",
  RUN_PACE_SEC_PER_KM: "Run pace (sec/km)",
  WEIGHT_KG: "Weight (kg)",
  CUSTOM: "Custom",
};

function formatValue(metric: GoalMetric, value: number) {
  if (metric === "SWIM_PACE_SEC_PER_100M" || metric === "RUN_PACE_SEC_PER_KM") {
    return formatPaceSeconds(value);
  }
  return value.toString();
}

export default async function GoalsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const progress = await Promise.all(
    goals.map((goal) => computeGoalProgress(userId, goal))
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <p className="text-sm text-foreground/70">
        Progress is computed from your last 28 days of synced activity/health
        data where possible.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add goal</h2>
        <form
          action={addGoal}
          className="flex flex-wrap items-end gap-3 card p-4"
        >
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="label" className="block text-sm font-medium">
              Label
            </label>
            <input
              id="label"
              name="label"
              type="text"
              required
              maxLength={120}
              placeholder="36 km/h on a 40km bike split"
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="metric" className="block text-sm font-medium">
              Metric
            </label>
            <select
              id="metric"
              name="metric"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              {Object.entries(METRIC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="targetValue" className="block text-sm font-medium">
              Target
            </label>
            <input
              id="targetValue"
              name="targetValue"
              type="number"
              step="0.1"
              required
              className="w-24 rounded-md border border-line bg-transparent px-2 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="direction" className="block text-sm font-medium">
              Direction
            </label>
            <select
              id="direction"
              name="direction"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              <option value="INCREASE">Higher is better</option>
              <option value="DECREASE">Lower is better</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="deadline" className="block text-sm font-medium">
              Deadline (optional)
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {goals.length === 0 ? (
          <p className="text-sm text-foreground/70">No goals set yet.</p>
        ) : (
          goals.map((goal, i) => {
            const { currentValue, unit, pct } = progress[i];
            return (
              <div
                key={goal.id}
                className="space-y-2 card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{goal.label}</p>
                    <p className="text-sm text-foreground/60">
                      Target: {formatValue(goal.metric, goal.targetValue)}
                      {unit ? ` ${unit}` : ""}
                      {goal.deadline &&
                        ` · by ${goal.deadline.toISOString().slice(0, 10)}`}
                    </p>
                  </div>
                  <form action={deleteGoal}>
                    <input type="hidden" name="id" value={goal.id} />
                    <button
                      type="submit"
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {currentValue != null && pct != null ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Current</span>
                      <span className="text-foreground/70">
                        {formatValue(goal.metric, currentValue)} {unit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-foreground/[0.06]">
                      <div
                        className="h-2 rounded-full bg-foreground/70"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/50">
                    Not enough recent data to measure progress yet.
                  </p>
                )}
                {goal.notes && (
                  <p className="text-sm text-foreground/70">{goal.notes}</p>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

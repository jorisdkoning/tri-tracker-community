import type { PlannedWorkout } from "@prisma/client";
import { formatDuration } from "@/lib/format";
import { DAY_MS } from "@/lib/time";
import { sportColor } from "./sport-style";

function whenLabel(date: Date, today: Date): string {
  const dayDiff = Math.round((date.getTime() - today.getTime()) / DAY_MS);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function ComingUp({ workouts, today }: { workouts: PlannedWorkout[]; today: Date }) {
  if (workouts.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Coming up</h2>
      <div className="card divide-y divide-line">
        {workouts.map((workout) => (
          <div key={workout.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sportColor(workout.sport)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{workout.name}</p>
              <p className="text-xs text-foreground/60">
                {whenLabel(workout.date, today)}
                {workout.startTime && ` · ${workout.startTime}`}
              </p>
            </div>
            {workout.durationSec != null && (
              <p className="text-sm tabular-nums text-foreground/70">
                {formatDuration(workout.durationSec)}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

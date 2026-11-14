import { formatDuration, formatKm } from "@/lib/format";
import { ENDURANCE_SPORTS, type WeekSummary as Summary } from "@/lib/dashboard-summary";
import { sportColor } from "./sport-style";

const LABELS = { SWIM: "Swim", BIKE: "Bike", RUN: "Run" } as const;

function SportCard({
  label,
  color,
  time,
  count,
  distance,
  total,
}: {
  label: string;
  color: string;
  time: number;
  count: number;
  distance?: number;
  total: number;
}) {
  const share = total > 0 ? (time / total) * 100 : 0;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-sm text-foreground/60">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatDuration(time)}</p>
      <p className="text-xs text-foreground/60">
        {count} {count === 1 ? "session" : "sessions"}
        {distance != null && distance > 0 && ` · ${formatKm(distance)}`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

export function WeekSummary({ week }: { week: Summary }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">This week</h2>
        <p className="text-sm text-foreground/60">{formatDuration(week.totalTime)} total</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ENDURANCE_SPORTS.map((sport) => (
          <SportCard
            key={sport}
            label={LABELS[sport]}
            color={sportColor(sport)}
            total={week.totalTime}
            {...week.bySport[sport]}
          />
        ))}
        <SportCard
          label="Strength"
          color={sportColor("STRENGTH")}
          total={week.totalTime}
          time={week.strength.time}
          count={week.strength.count}
        />
      </div>
    </section>
  );
}

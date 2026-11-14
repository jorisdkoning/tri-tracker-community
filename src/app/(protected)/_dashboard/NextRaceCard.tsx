import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard-data";

const DISTANCE_LABELS: Record<string, string> = {
  SPRINT: "Sprint",
  OLYMPIC: "Olympic",
  HALF_IRONMAN: "70.3",
  IRONMAN: "Ironman",
  OTHER: "Event",
};

export function NextRaceCard({
  races,
  daysToRace,
}: {
  races: DashboardData["races"];
  daysToRace: number | null;
}) {
  const next = races[0];
  return (
    <Link href="/races" className="card block p-5 hover:bg-foreground/[0.03]">
      <p className="text-sm font-medium text-foreground/60">Next event</p>
      {next && daysToRace != null ? (
        <>
          <p className="mt-3 text-4xl font-semibold tabular-nums">
            {daysToRace}
            <span className="ml-1 text-base font-normal text-foreground/60">
              {daysToRace === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="mt-1 truncate font-medium">{next.name}</p>
          <p className="text-sm text-foreground/60">
            {DISTANCE_LABELS[next.distanceType]} · {next.date.toISOString().slice(0, 10)}
          </p>
          {races.length > 1 && (
            <p className="mt-2 truncate text-xs text-foreground/50">
              Then: {races.slice(1).map((race) => race.name).join(", ")}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-foreground/60">
          No upcoming event. Add one to start the countdown.
        </p>
      )}
    </Link>
  );
}

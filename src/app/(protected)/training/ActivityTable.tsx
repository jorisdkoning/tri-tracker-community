"use client";

import { useState } from "react";
import type { Sport } from "@prisma/client";

import { formatDuration } from "@/lib/format";
export type RowSport = Sport | "STRENGTH";

export interface ActivityRow {
  id: string;
  sport: RowSport;
  name: string;
  startDate: string; // YYYY-MM-DD
  movingTime: number;
  distance: number;
  elevationGain: number | null;
  avgHr: number | null;
  avgPower: number | null;
  avgCadence: number | null;
  trainingLoad: number | null;
}

const FILTERS: Array<{ label: string; value: RowSport | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Swim", value: "SWIM" },
  { label: "Bike", value: "BIKE" },
  { label: "Run", value: "RUN" },
  { label: "Strength", value: "STRENGTH" },
  { label: "Other", value: "OTHER" },
];

function formatDistance(meters: number) {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function ActivityTable({ activities }: { activities: ActivityRow[] }) {
  const [filter, setFilter] = useState<RowSport | "ALL">("ALL");
  const filtered =
    filter === "ALL" ? activities : activities.filter((a) => a.sport === filter);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f.value
                ? "bg-foreground text-background"
                : "bg-foreground/[0.06] text-foreground/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-foreground/70">No activities in this category.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-foreground/60">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Sport</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Distance</th>
                <th className="py-2 pr-4">Elev</th>
                <th className="py-2 pr-4">Avg HR</th>
                <th className="py-2 pr-4">Avg Power</th>
                <th className="py-2 pr-4">Cadence</th>
                <th className="py-2 pr-4">Effort</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((activity) => (
                <tr key={activity.id} className="border-b border-line">
                  <td className="py-2 pr-4">{activity.startDate}</td>
                  <td className="py-2 pr-4">{activity.sport === "STRENGTH" ? "Strength" : activity.sport}</td>
                  <td className="py-2 pr-4">{activity.name}</td>
                  <td className="py-2 pr-4">{formatDuration(activity.movingTime)}</td>
                  <td className="py-2 pr-4">{activity.distance > 0 ? formatDistance(activity.distance) : "—"}</td>
                  <td className="py-2 pr-4">
                    {activity.elevationGain != null ? `${Math.round(activity.elevationGain)}m` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {activity.avgHr != null ? Math.round(activity.avgHr) : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {activity.avgPower != null ? `${Math.round(activity.avgPower)}W` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {activity.avgCadence != null ? Math.round(activity.avgCadence) : "—"}
                  </td>
                  <td className="py-2 pr-4">{activity.trainingLoad != null ? Math.round(activity.trainingLoad) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyVolumePoint } from "@/lib/training-stats";

export function VolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/15" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} minTickGap={20} />
          <YAxis tick={{ fontSize: 12 }} unit="h" />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="SWIM" name="Swim" fill="#7c3aed" />
          <Bar dataKey="BIKE" name="Bike" fill="#2563eb" />
          <Bar dataKey="RUN" name="Run" fill="#dc2626" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

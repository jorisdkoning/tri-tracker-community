"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FitnessPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export function FitnessChart({ data }: { data: FitnessPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/15" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={30} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line type="monotone" dataKey="ctl" name="Fitness (CTL)" stroke="#2563eb" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="atl" name="Fatigue (ATL)" stroke="#dc2626" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="tsb" name="Form (TSB)" stroke="#16a34a" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

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

export interface MetricPoint {
  date: string;
  value: number;
}

export function MetricChart({
  data,
  name,
  color,
  unit,
}: {
  data: MetricPoint[];
  name: string;
  color: string;
  unit: string;
}) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-black/10 dark:stroke-white/15"
          />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
          <YAxis
            tick={{ fontSize: 11 }}
            domain={["auto", "auto"]}
            width={40}
          />
          <Tooltip formatter={(value) => [`${value} ${unit}`, name]} />
          <Line
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

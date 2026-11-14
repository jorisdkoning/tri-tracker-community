"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InsightDay } from "@/lib/nutrition-insights";

function IntakeChart({
  data,
  valueKey,
  targetKey,
  unit,
  barColor,
}: {
  data: InsightDay[];
  valueKey: "kcal" | "protein";
  targetKey: "targetKcal" | "targetProtein";
  unit: string;
  barColor: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/15" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 12 }} unit={unit} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={valueKey} name="Logged" fill={barColor} radius={[3, 3, 0, 0]} />
          <Line
            dataKey={targetKey}
            name="Target"
            type="stepAfter"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NutritionCharts({ days }: { days: InsightDay[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground/70">Calories vs target</h3>
        <IntakeChart data={days} valueKey="kcal" targetKey="targetKcal" unit="" barColor="#2563eb" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground/70">Protein vs target (g)</h3>
        <IntakeChart data={days} valueKey="protein" targetKey="targetProtein" unit="" barColor="#16a34a" />
      </div>
    </div>
  );
}

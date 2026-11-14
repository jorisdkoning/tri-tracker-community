import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MetricChart, type MetricPoint } from "./MetricChart";

import { daysAgo } from "@/lib/time";
const WINDOW_DAYS = 90;

export default async function HealthPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const since = daysAgo(WINDOW_DAYS);
  const metrics = await prisma.dailyMetric.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  function series(field: "hrv" | "restingHr" | "sleepHours" | "weightKg") {
    return metrics
      .filter((m) => m[field] != null)
      .map<MetricPoint>((m) => ({
        date: m.date.toISOString().slice(0, 10),
        value: Math.round((m[field] as number) * 10) / 10,
      }));
  }

  const hrv = series("hrv");
  const restingHr = series("restingHr");
  const sleep = series("sleepHours");
  const weight = series("weightKg");
  const hasAnyData = metrics.length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Health</h1>

      {!hasAnyData ? (
        <p className="text-foreground/70">
          No health data yet. It arrives two ways: syncing intervals.icu in
          Settings (if your wellness data lives there), or pointing the Health
          Auto Export iOS app at this app&apos;s{" "}
          <span className="font-mono text-sm">/api/ingest/health</span>{" "}
          endpoint once deployed.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <ChartSection title="HRV" unit="ms" data={hrv} color="#7c3aed" />
          <ChartSection
            title="Resting heart rate"
            unit="bpm"
            data={restingHr}
            color="#dc2626"
          />
          <ChartSection
            title="Sleep"
            unit="h"
            data={sleep}
            color="#2563eb"
          />
          <ChartSection
            title="Weight"
            unit="kg"
            data={weight}
            color="#16a34a"
          />
        </div>
      )}
    </div>
  );
}

function ChartSection({
  title,
  unit,
  data,
  color,
}: {
  title: string;
  unit: string;
  data: MetricPoint[];
  color: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-foreground/70">No data in the last 90 days.</p>
      ) : (
        <MetricChart data={data} name={title} color={color} unit={unit} />
      )}
    </section>
  );
}

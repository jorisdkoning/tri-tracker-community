import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard-data";

function SmallStat({
  label,
  value,
  unit,
  digits,
}: {
  label: string;
  value: number | null;
  unit: string;
  digits: number;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value != null ? value.toFixed(digits) : "—"}
        {value != null && <span className="ml-1 text-xs font-normal text-foreground/60">{unit}</span>}
      </p>
    </div>
  );
}

export function Recovery({ recovery }: { recovery: DashboardData["recovery"] }) {
  const empty = Object.values(recovery).every((value) => value == null);
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Recovery</h2>
        <Link href="/health" className="text-sm text-accent">
          Health →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SmallStat label="HRV" value={recovery.hrv} unit="ms" digits={0} />
        <SmallStat label="Resting HR" value={recovery.restingHr} unit="bpm" digits={0} />
        <SmallStat label="Sleep" value={recovery.sleepHours} unit="h" digits={1} />
        <SmallStat label="Weight" value={recovery.weightKg} unit="kg" digits={1} />
      </div>
      {empty && (
        <p className="text-xs text-foreground/50">
          Appears once Health Auto Export sends your daily metrics.
        </p>
      )}
    </section>
  );
}

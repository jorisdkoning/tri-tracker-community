import type { DashboardData } from "@/lib/dashboard-data";

function Metric({
  label,
  value,
  hint,
  hintTone,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
}) {
  return (
    <div>
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={`text-xs ${hintTone ?? "text-foreground/60"}`}>{hint}</p>}
    </div>
  );
}

export function FitnessCard({ fitness }: { fitness: DashboardData["fitness"] }) {
  const delta = fitness?.ctlDelta ?? null;
  return (
    <div className="card p-5 md:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground/60">Fitness &amp; form</p>
        {fitness && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${fitness.form.tone}`}
          >
            {fitness.form.label}
          </span>
        )}
      </div>
      {fitness ? (
        <div className="mt-3 grid grid-cols-3 gap-4">
          <Metric
            label="Fitness (CTL)"
            value={fitness.ctl.toFixed(1)}
            hint={
              delta != null
                ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} vs 7d`
                : undefined
            }
            hintTone={delta != null && delta >= 0 ? "text-good" : "text-run"}
          />
          <Metric label="Fatigue (ATL)" value={fitness.atl.toFixed(1)} />
          <Metric label="Form (TSB)" value={fitness.tsb.toFixed(1)} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-foreground/60">No fitness data yet. Hit Sync in Settings.</p>
      )}
    </div>
  );
}

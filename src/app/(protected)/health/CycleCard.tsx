import type { CycleData } from "@/lib/cycle-data";
import type { CyclePhase } from "@/lib/cycle";
import { deletePeriodStart, logPeriodStart, stopCycleTracking } from "./cycle-actions";

const PHASES: CyclePhase[] = ["Period", "Follicular", "Ovulation", "Luteal"];

function PeriodForm({ today, label }: { today: string; label: string }) {
  return (
    <form action={logPeriodStart} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-sm font-medium">
        <span className="block">{label}</span>
        <input type="date" name="date" required max={today} defaultValue={today} className="rounded-md border border-line bg-transparent px-3 py-2 text-sm" />
      </label>
      <button type="submit" className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium">
        Save
      </button>
    </form>
  );
}

export function CycleCard({ cycle, today }: { cycle: CycleData | null; today: string }) {
  if (!cycle) {
    return (
      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Cycle tracking (optional)</h2>
        <p className="text-sm text-foreground/70">
          Have a menstrual cycle? Log when your period starts and FitLog shows which phase you&apos;re in, a training
          tip for it, and how your energy, sleep and HRV change across your cycle. Only you can see this; it&apos;s
          never shared, also not in groups.
        </p>
        <PeriodForm today={today} label="My last period started on" />
      </section>
    );
  }
  const { status, averages } = cycle;
  const hasAverages = PHASES.some((p) => averages[p].feeling != null || averages[p].hrv != null || averages[p].sleepHours != null);
  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground/60">Your cycle</p>
          <p className="text-2xl font-semibold">{status ? status.phase : "No recent period logged"}</p>
        </div>
        {status && (
          <p className="text-right text-sm text-foreground/60">
            Day {status.day} of about {status.length}
            <br />
            Next period around {status.nextPeriod}
          </p>
        )}
      </div>
      {status && <p className="text-sm">{status.tip}</p>}
      {status?.late && (
        <p className="rounded-md bg-warn/15 px-3 py-2 text-sm text-warn">
          Your period seems later than usual. Log it below when it starts.
        </p>
      )}
      <PeriodForm today={today} label="My period started on" />
      {hasAverages && (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-medium">How you feel per phase</p>
          <table className="w-full text-sm">
            <thead className="text-left text-foreground/60">
              <tr>
                <th className="py-1 font-normal">Phase</th>
                <th className="py-1 font-normal">Check-in (1-5)</th>
                <th className="py-1 font-normal">HRV</th>
                <th className="py-1 font-normal">Sleep</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase) => (
                <tr key={phase} className="border-t border-line">
                  <td className="py-1">{phase}</td>
                  <td className="py-1 tabular-nums">{averages[phase].feeling ?? "–"}</td>
                  <td className="py-1 tabular-nums">{averages[phase].hrv != null ? `${averages[phase].hrv} ms` : "–"}</td>
                  <td className="py-1 tabular-nums">
                    {averages[phase].sleepHours != null ? `${averages[phase].sleepHours} h` : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">Logged periods and settings</summary>
        <ul className="mt-2 space-y-1">
          {cycle.periods.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="tabular-nums">{p.date}</span>
              <form action={deletePeriodStart}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={stopCycleTracking} className="mt-3">
          <button type="submit" className="text-red-600 hover:underline dark:text-red-400">
            Stop cycle tracking and delete all cycle data
          </button>
        </form>
      </details>
      <p className="text-xs text-foreground/50">Estimates only, not medical advice or contraception.</p>
    </section>
  );
}

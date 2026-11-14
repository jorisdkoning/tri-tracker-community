import Link from "next/link";
import { requireUser } from "@/lib/session";
import { computeNutritionInsights, type Insight } from "@/lib/nutrition-insights";
import { NutritionCharts } from "./NutritionCharts";

const SEVERITY_STYLE: Record<Insight["severity"], { dot: string; label: string }> = {
  high: { dot: "bg-run", label: "Work on this" },
  medium: { dot: "bg-warn", label: "Improve" },
  info: { dot: "bg-accent", label: "Note" },
  good: { dot: "bg-good", label: "Going well" },
};

export default async function NutritionInsightsPage() {
  const user = await requireUser();
  const data = await computeNutritionInsights(user.id, user.timezone, 14, user.showFodmap);

  const pct = (value: number | null, target: number | null) =>
    value != null && target ? Math.round((value / target) * 100) : null;
  const kcalPct = pct(data.avgKcal, data.avgTargetKcal);
  const proteinPct = pct(data.avgProtein, data.avgTargetProtein);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link href="/nutrition" className="text-sm text-accent">
          ← Nutrition
        </Link>
        <h1 className="text-2xl font-semibold">Nutrition insights</h1>
        <p className="text-sm text-foreground/70">
          The last {data.windowDays} completed days (today is left out), compared
          with the daily target that follows your training.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Days logged" value={`${data.loggedDays} / ${data.windowDays}`} />
        <Tile
          label="Avg calories"
          value={data.avgKcal != null ? `${Math.round(data.avgKcal)}` : "-"}
          hint={data.avgTargetKcal != null ? `target ${Math.round(data.avgTargetKcal)}${kcalPct != null ? ` · ${kcalPct}%` : ""}` : undefined}
        />
        <Tile
          label="Avg protein"
          value={data.avgProtein != null ? `${Math.round(data.avgProtein)} g` : "-"}
          hint={data.avgTargetProtein != null ? `target ${Math.round(data.avgTargetProtein)} g${proteinPct != null ? ` · ${proteinPct}%` : ""}` : undefined}
        />
        <Tile
          label="Training days"
          value={`${data.days.filter((d) => d.trainingMin >= 10).length}`}
          hint="in this period"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Intake against target</h2>
        <NutritionCharts days={data.days} />
        <p className="text-xs text-foreground/50">
          Days without any logged food show as empty bars. The orange line is the
          target for that day: it goes up on training days and before a race.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where to improve</h2>
        <div className="space-y-3">
          {data.insights.map((insight) => {
            const style = SEVERITY_STYLE[insight.severity];
            return (
              <div key={insight.title} className="card p-4">
                <div className="flex items-center gap-2 text-xs text-foreground/60">
                  <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {style.label}
                </div>
                <p className="mt-1 font-medium">{insight.title}</p>
                <p className="mt-1 text-sm text-foreground/70">{insight.detail}</p>
                {insight.action && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">What to do: </span>
                    {insight.action}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-foreground/50">
          General guidance based on what you logged, not medical or dietitian
          advice. Ask the Coach for a personal review.
        </p>
      </section>

      {data.mealTypeShare.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Where your calories come from</h2>
          <div className="card space-y-3 p-4">
            {data.mealTypeShare.map((meal) => (
              <div key={meal.type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{meal.type}</span>
                  <span className="tabular-nums text-foreground/60">
                    {meal.pct}% · {Math.round(meal.kcal)} kcal
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${meal.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-foreground/60">{hint}</p>}
    </div>
  );
}

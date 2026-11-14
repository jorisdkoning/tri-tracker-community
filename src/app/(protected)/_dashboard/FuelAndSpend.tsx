import Link from "next/link";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatMoney } from "@/lib/profile";

export function FuelAndSpend({
  fuel,
  monthSpend,
  currency,
}: {
  fuel: DashboardData["fuel"];
  monthSpend: number;
  currency: string;
}) {
  const { kcal, protein, plan } = fuel;
  return (
    <div className="grid gap-3">
      <Link href="/nutrition" className="card block p-4 hover:bg-foreground/[0.03]">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-foreground/60">Fuel today</p>
          <p className="text-xs capitalize text-foreground/50">{plan.tier} day</p>
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {kcal}
          <span className="ml-1 text-sm font-normal text-foreground/60">
            / {plan.targets.calories} kcal
          </span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-good"
            style={{ width: `${Math.min(100, (kcal / plan.targets.calories) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-foreground/60">
          {protein} / {plan.targets.proteinG} g protein
        </p>
      </Link>
      <Link href="/budget" className="card block p-4 hover:bg-foreground/[0.03]">
        <p className="text-sm text-foreground/60">Spent this month</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(Math.round(monthSpend), currency)}</p>
      </Link>
    </div>
  );
}

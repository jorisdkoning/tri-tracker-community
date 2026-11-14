import { requireUser } from "@/lib/session";
import { loadDashboardData } from "@/lib/dashboard-data";
import { CheckInCard } from "./_dashboard/CheckInCard";
import { cookies } from "next/headers";
import { loadGettingStarted } from "@/lib/getting-started-data";
import { GettingStarted } from "./_dashboard/GettingStarted";
import { FitnessCard } from "./_dashboard/FitnessCard";
import { NextRaceCard } from "./_dashboard/NextRaceCard";
import { WeekSummary } from "./_dashboard/WeekSummary";
import { ComingUp } from "./_dashboard/ComingUp";
import { RecentActivities } from "./_dashboard/RecentActivities";
import { Recovery } from "./_dashboard/Recovery";
import { GoalsCard } from "./_dashboard/GoalsCard";
import { FuelAndSpend } from "./_dashboard/FuelAndSpend";
import { ReadinessCard } from "./_dashboard/ReadinessCard";
import { AchievementsCard } from "./_dashboard/AchievementsCard";
import { loadAchievements } from "@/lib/achievements-data";

export default async function DashboardPage() {
  const user = await requireUser();
  const hideChecklist = (await cookies()).get("hide_getting_started")?.value === user.id;
  const [data, steps, achievements] = await Promise.all([
    loadDashboardData(user.id, user.timezone),
    hideChecklist ? null : loadGettingStarted(user.id),
    loadAchievements(user.id, user.timezone),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-foreground/60">{data.dateLabel}</p>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
      </div>

      {steps && <GettingStarted steps={steps} />}

      <CheckInCard {...data.checkIn} />

      <ReadinessCard readiness={data.readiness} />

      <div className="grid gap-4 md:grid-cols-3">
        <FitnessCard fitness={data.fitness} />
        <NextRaceCard races={data.races} daysToRace={data.daysToRace} />
      </div>

      <WeekSummary week={data.week} />
      <ComingUp workouts={data.upcoming} today={data.today} />

      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivities items={data.recent} />
        <Recovery recovery={data.recovery} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <GoalsCard goals={data.goals} />
        <FuelAndSpend fuel={data.fuel} monthSpend={data.monthSpend} currency={user.currency} />
      </div>

      <AchievementsCard achievements={achievements} />
    </div>
  );
}

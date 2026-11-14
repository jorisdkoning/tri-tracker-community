import type { DistanceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { addRace, deleteRace } from "./actions";

const DISTANCE_LABELS: Record<DistanceType, string> = {
  SPRINT: "Sprint triathlon",
  OLYMPIC: "Olympic triathlon",
  HALF_IRONMAN: "70.3 / Half",
  IRONMAN: "Full Ironman",
  OTHER: "Event",
};

function daysUntil(date: Date) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function RacesPage() {
  const user = await requireUser();
  const userId = user.id;

  const races = await prisma.race.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    include: {
      expenses: { select: { amount: true } },
    },
  });

  const upcoming = races.filter((race) => daysUntil(race.date) >= 0);
  const past = races.filter((race) => daysUntil(race.date) < 0).reverse();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Events</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add event</h2>
        <form
          action={addRace}
          className="flex flex-wrap items-end gap-3 card p-4"
        >
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="e.g. City Marathon"
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="date" className="block text-sm font-medium">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="distanceType" className="block text-sm font-medium">
              Distance
            </label>
            <select
              id="distanceType"
              name="distanceType"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              {Object.entries(DISTANCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="goal" className="block text-sm font-medium">
              Goal (optional)
            </label>
            <input
              id="goal"
              name="goal"
              type="text"
              maxLength={200}
              placeholder="e.g. sub 5:30"
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
          >
            Add
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-foreground/70">
            No upcoming events. Add your next goal above.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((race) => {
              const days = daysUntil(race.date);
              const spent = race.expenses.reduce(
                (sum, expense) => sum + expense.amount,
                0
              );
              return (
                <div
                  key={race.id}
                  className="space-y-2 card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{race.name}</p>
                      <p className="text-sm text-foreground/70">
                        {DISTANCE_LABELS[race.distanceType]} ·{" "}
                        {race.date.toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <p className="text-right">
                      <span className="text-2xl font-semibold">{days}</span>
                      <span className="text-sm text-foreground/60"> days</span>
                    </p>
                  </div>
                  {race.goal && (
                    <p className="text-sm">
                      <span className="text-foreground/60">Goal:</span>{" "}
                      {race.goal}
                    </p>
                  )}
                  {spent > 0 && (
                    <p className="text-sm text-foreground/60">
                      Spent so far: {formatMoney(spent, user.currency)}
                    </p>
                  )}
                  <form action={deleteRace}>
                    <input type="hidden" name="id" value={race.id} />
                    <button
                      type="submit"
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Past</h2>
          <ul className="space-y-2">
            {past.map((race) => (
              <li
                key={race.id}
                className="flex items-center justify-between rounded-md border border-line px-4 py-2 text-sm"
              >
                <span>
                  {race.name} · {DISTANCE_LABELS[race.distanceType]} ·{" "}
                  {race.date.toISOString().slice(0, 10)}
                </span>
                <form action={deleteRace}>
                  <input type="hidden" name="id" value={race.id} />
                  <button
                    type="submit"
                    className="text-red-600 dark:text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

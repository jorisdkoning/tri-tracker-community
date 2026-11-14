import Link from "next/link";
import type { MealType } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { effectiveFodmapRisk } from "@/lib/nutrition";
import { computeNutritionPlan } from "@/lib/nutrition-plan";
import { addMeal, deleteMeal, addSafeFood, deleteSafeFood } from "./actions";

import { localDateString } from "@/lib/time";
const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  PRE_TRAINING: "Pre-training",
  ON_BIKE: "On the bike",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

function todayRange(timeZone: string) {
  const start = new Date(localDateString(timeZone));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function ProgressBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const color = pct >= 85 ? "bg-green-600" : "bg-amber-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-foreground/70">
          {value}
          {unit} / {target}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-foreground/[0.06]">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function NutritionPage() {
  const user = await requireUser();
  const userId = user.id;
  const { start, end } = todayRange(user.timezone);

  const [meals, safeFoods, plan] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.safeFood.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    computeNutritionPlan(userId, localDateString(user.timezone)),
  ]);

  const { tier, targets } = plan;

  const totalCalories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.proteinG ?? 0), 0);

  const mealsByType = new Map<MealType, typeof meals>();
  for (const meal of meals) {
    const list = mealsByType.get(meal.mealType) ?? [];
    list.push(meal);
    mealsByType.set(meal.mealType, list);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Nutrition</h1>
        <Link href="/nutrition/insights" className="text-sm text-accent">
          Insights →
        </Link>
      </div>
      <p className="text-sm text-foreground/70">
        {user.showFodmap && "Low-FODMAP as a guide: meals with common trigger foods get a warning. "}
        Today looks like a <strong>{tier}</strong> day.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/70">
        {plan.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <section className="grid gap-4 sm:grid-cols-2">
        <ProgressBar
          label="Calories"
          value={totalCalories}
          target={targets.calories}
          unit=" kcal"
        />
        <ProgressBar
          label="Protein"
          value={totalProtein}
          target={targets.proteinG}
          unit="g"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Today&apos;s meals</h2>
        <form
          action={addMeal}
          className="flex flex-wrap items-end gap-3 card p-4"
        >
          <input
            type="hidden"
            name="date"
            value={start.toISOString().slice(0, 10)}
          />
          <div className="space-y-1">
            <label htmlFor="mealType" className="block text-sm font-medium">
              Meal
            </label>
            <select
              id="mealType"
              name="mealType"
              required
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="safeFoodId" className="block text-sm font-medium">
              Saved food
            </label>
            <select
              id="safeFoodId"
              name="safeFoodId"
              className="rounded-md border border-line bg-transparent px-3 py-2 text-sm dark:bg-black"
            >
              <option value="">— free text instead —</option>
              {safeFoods.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="description" className="block text-sm font-medium">
              Or describe it
            </label>
            <input
              id="description"
              name="description"
              type="text"
              maxLength={200}
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="calories" className="block text-sm font-medium">
              kcal
            </label>
            <input
              id="calories"
              name="calories"
              type="number"
              min={1}
              className="w-20 rounded-md border border-line bg-transparent px-2 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="proteinG" className="block text-sm font-medium">
              Protein (g)
            </label>
            <input
              id="proteinG"
              name="proteinG"
              type="number"
              min={0}
              className="w-20 rounded-md border border-line bg-transparent px-2 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium"
          >
            Add
          </button>
        </form>

        {meals.length === 0 ? (
          <p className="text-sm text-foreground/70">No meals logged today.</p>
        ) : (
          <div className="space-y-2">
            {Array.from(mealsByType.entries()).map(([type, items]) => (
              <div key={type}>
                <p className="text-xs font-medium text-foreground/60">
                  {MEAL_TYPE_LABELS[type]}
                </p>
                <ul className="space-y-1">
                  {items.map((meal) => (
                    <li
                      key={meal.id}
                      className="flex items-center justify-between rounded-md border border-line px-3 py-1.5 text-sm"
                    >
                      <span>
                        {meal.description}
                        {meal.calories != null && ` · ${meal.calories}kcal`}
                        {meal.proteinG != null && ` · ${meal.proteinG}g protein`}
                        {user.showFodmap && effectiveFodmapRisk(meal) === "HIGH" && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400">
                            ⚠ high-FODMAP
                          </span>
                        )}
                      </span>
                      <form action={deleteMeal}>
                        <input type="hidden" name="id" value={meal.id} />
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
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Saved foods</h2>
        <form
          action={addSafeFood}
          className="flex flex-wrap items-end gap-3 card p-4"
        >
          <div className="flex-1 space-y-1 min-w-40">
            <label htmlFor="sf-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="sf-name"
              name="name"
              type="text"
              required
              maxLength={120}
              placeholder="Rice cakes + PB + honey"
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="sf-calories" className="block text-sm font-medium">
              kcal
            </label>
            <input
              id="sf-calories"
              name="calories"
              type="number"
              min={1}
              className="w-20 rounded-md border border-line bg-transparent px-2 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="sf-protein" className="block text-sm font-medium">
              Protein (g)
            </label>
            <input
              id="sf-protein"
              name="proteinG"
              type="number"
              min={0}
              className="w-20 rounded-md border border-line bg-transparent px-2 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="isRideFood" /> Ride food
          </label>
          <button
            type="submit"
            className="rounded-md bg-foreground/[0.06] px-4 py-2 text-sm font-medium"
          >
            Save
          </button>
        </form>

        {safeFoods.length > 0 && (
          <ul className="space-y-1">
            {safeFoods.map((food) => (
              <li
                key={food.id}
                className="flex items-center justify-between rounded-md border border-line px-3 py-1.5 text-sm"
              >
                <span>
                  {food.name}
                  {food.calories != null && ` · ${food.calories}kcal`}
                  {food.proteinG != null && ` · ${food.proteinG}g protein`}
                  {food.isRideFood && " · 🚴"}
                </span>
                <form action={deleteSafeFood}>
                  <input type="hidden" name="id" value={food.id} />
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
        )}
      </section>
    </div>
  );
}

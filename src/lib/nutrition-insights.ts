import { prisma } from "@/lib/prisma";
import { effectiveFodmapRisk } from "@/lib/nutrition";
import { computeNutritionPlan } from "@/lib/nutrition-plan";


import { DAY_MS } from "@/lib/time";
import { localDateString } from "@/lib/time";
export interface InsightDay {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Mon 2"
  entries: number;
  kcal: number;
  protein: number;
  targetKcal: number;
  targetProtein: number;
  tier: string;
  trainingMin: number;
  highFodmapMeals: number;
}

export interface Insight {
  severity: "high" | "medium" | "good" | "info";
  title: string;
  detail: string;
  action?: string;
}

export interface NutritionInsights {
  days: InsightDay[];
  windowDays: number;
  loggedDays: number;
  avgKcal: number | null;
  avgTargetKcal: number | null;
  avgProtein: number | null;
  avgTargetProtein: number | null;
  mealTypeShare: { type: string; kcal: number; pct: number }[];
  insights: Insight[];
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  PRE_TRAINING: "Pre-training",
  ON_BIKE: "On the bike",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

function mean(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const round = (n: number) => Math.round(n);

// Looks at the last `windowDays` completed days (today is left out because the
// day isn't over yet) and compares what was logged with the daily targets from
// computeNutritionPlan. All advice is rule based, so it is predictable and
// free to compute; the Coach can add a personal review on top of this data.
export async function computeNutritionInsights(
  userId: string,
  timeZone: string,
  windowDays = 14
): Promise<NutritionInsights> {
  const today = new Date(localDateString(timeZone));
  const start = new Date(today.getTime() - windowDays * DAY_MS);

  const dayKeys = Array.from({ length: windowDays }, (_, i) =>
    new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10)
  );

  const [meals, plans] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: { gte: start, lt: today } },
      orderBy: { date: "asc" },
    }),
    Promise.all(dayKeys.map((day) => computeNutritionPlan(userId, day))),
  ]);

  const days: InsightDay[] = dayKeys.map((date, index) => {
    const dayMeals = meals.filter((m) => m.date.toISOString().slice(0, 10) === date);
    const plan = plans[index];
    const d = new Date(date + "T00:00:00Z");
    return {
      date,
      label: d.toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric" }),
      entries: dayMeals.length,
      kcal: dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0),
      protein: dayMeals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
      targetKcal: plan.targets.calories,
      targetProtein: plan.targets.proteinG,
      tier: plan.tier,
      trainingMin: Math.round(plan.enduranceMin + plan.gymMin * 0.5),
      highFodmapMeals: dayMeals.filter((m) => effectiveFodmapRisk(m) === "HIGH").length,
    };
  });

  const logged = days.filter((d) => d.entries > 0);
  const avgKcal = mean(logged.map((d) => d.kcal));
  const avgTargetKcal = mean(logged.map((d) => d.targetKcal));
  const avgProtein = mean(logged.map((d) => d.protein));
  const avgTargetProtein = mean(logged.map((d) => d.targetProtein));

  const totalKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const byType = new Map<string, number>();
  for (const m of meals) byType.set(m.mealType, (byType.get(m.mealType) ?? 0) + (m.calories ?? 0));
  const mealTypeShare = [...byType.entries()]
    .map(([type, kcal]) => ({
      type: MEAL_LABELS[type] ?? type,
      kcal,
      pct: totalKcal > 0 ? Math.round((kcal / totalKcal) * 100) : 0,
    }))
    .sort((a, b) => b.kcal - a.kcal);

  const insights: Insight[] = [];

  // 1. Logging coverage - everything below is only as good as the logging.
  if (logged.length < windowDays * 0.5) {
    insights.push({
      severity: "high",
      title: `You logged food on ${logged.length} of the last ${windowDays} days`,
      detail:
        "With this many gaps the averages below are rough, and low days may just be days you did not log.",
      action:
        "Log it right after you eat: send Claude a photo or a line like \"2 eggs on toast\" in your Food log chat. Aim for 5 of 7 days first.",
    });
  } else {
    insights.push({
      severity: "good",
      title: `Good logging: ${logged.length} of ${windowDays} days`,
      detail: "That is enough to see real patterns.",
    });
  }

  const entriesWithoutNumbers = meals.filter((m) => m.calories == null || m.proteinG == null).length;
  if (meals.length > 0 && entriesWithoutNumbers / meals.length > 0.2) {
    insights.push({
      severity: "medium",
      title: `${entriesWithoutNumbers} of ${meals.length} entries have no calories or protein`,
      detail: "Those meals count as zero, which pulls your totals down.",
      action: "When you log via Claude, it estimates both. In the app, add calories and protein or pick a saved food.",
    });
  }

  if (logged.length > 0 && avgKcal != null && avgTargetKcal != null) {
    // 2. Overall calories
    const gap = avgKcal - avgTargetKcal;
    const pct = (avgKcal / avgTargetKcal) * 100;
    if (pct < 85) {
      insights.push({
        severity: "high",
        title: `About ${round(-gap)} kcal per day under your target`,
        detail: `You averaged ${round(avgKcal)} kcal against a target of ${round(avgTargetKcal)} on the days you logged (${round(pct)}%).`,
        action:
          "Add one or two easy snacks of 200 to 300 kcal, for example rice cakes with peanut butter, a banana with a handful of nuts, or gluten-free oats. Do not cut training days short on fuel.",
      });
    } else if (pct > 115) {
      insights.push({
        severity: "medium",
        title: `About ${round(gap)} kcal per day over your target`,
        detail: `You averaged ${round(avgKcal)} kcal against ${round(avgTargetKcal)} (${round(pct)}%).`,
        action: "If weight is not a goal, this is fine on hard training days. On rest days, trim the snacks first.",
      });
    } else {
      insights.push({
        severity: "good",
        title: "Calories are close to your target",
        detail: `${round(avgKcal)} kcal on average against ${round(avgTargetKcal)} (${round(pct)}%).`,
      });
    }

    // 3. Fuelling on hard days
    const hard = logged.filter((d) => d.tier === "moderate" || d.tier === "heavy");
    if (hard.length >= 2) {
      const hardPct =
        ((mean(hard.map((d) => d.kcal)) ?? 0) / (mean(hard.map((d) => d.targetKcal)) ?? 1)) * 100;
      if (hardPct < 85) {
        insights.push({
          severity: "high",
          title: "You under-eat on your hardest training days",
          detail: `On ${hard.length} longer training days you reached ${round(hardPct)}% of the target.`,
          action:
            "Eat a carb-rich meal 2 to 3 hours before a long session, take carbs during rides over about 90 minutes, and eat again within an hour after.",
        });
      }
    }

    // 4. Pre-session fuelling on training days
    const trainDays = logged.filter((d) => d.trainingMin >= 60);
    const trainDayKeys = new Set(trainDays.map((d) => d.date));
    const fuelled = new Set(
      meals
        .filter((m) => (m.mealType === "PRE_TRAINING" || m.mealType === "ON_BIKE") && trainDayKeys.has(m.date.toISOString().slice(0, 10)))
        .map((m) => m.date.toISOString().slice(0, 10))
    );
    if (trainDays.length >= 2 && fuelled.size < trainDays.length) {
      insights.push({
        severity: "medium",
        title: `No pre-training or on-bike food logged on ${trainDays.length - fuelled.size} of ${trainDays.length} longer training days`,
        detail: "Either you trained fasted or the fuel was not logged.",
        action: "Log pre-training and on-bike food as such, so the app can show whether you fuel long sessions.",
      });
    }
  }

  // 5. Protein
  if (logged.length > 0 && avgProtein != null && avgTargetProtein != null) {
    const hit = logged.filter((d) => d.protein >= d.targetProtein * 0.9).length;
    const pct = (avgProtein / avgTargetProtein) * 100;
    if (pct < 85) {
      const short = round(avgTargetProtein - avgProtein);
      insights.push({
        severity: pct < 65 ? "high" : "medium",
        title: `Protein is about ${short} g per day short`,
        detail: `You averaged ${round(avgProtein)} g against a target of ${round(avgTargetProtein)} g, and reached it on ${hit} of ${logged.length} logged days.`,
        action:
          "Aim for 25 to 35 g at each main meal. Lactose-free and gluten-free options: eggs, chicken, fish and prawns, tofu or tempeh (check the label), lactose-free yoghurt or skyr, and a lactose-free protein powder in a smoothie.",
      });
    } else {
      insights.push({
        severity: "good",
        title: "Protein is on target",
        detail: `${round(avgProtein)} g on average against ${round(avgTargetProtein)} g, hit on ${hit} of ${logged.length} days.`,
      });
    }
  }

  // 6. FODMAP
  const fodmapMeals = meals.filter((m) => effectiveFodmapRisk(m) === "HIGH");
  if (fodmapMeals.length > 0) {
    const names = [...new Set(fodmapMeals.map((m) => m.description))].slice(0, 3).join("; ");
    insights.push({
      severity: "medium",
      title: `${fodmapMeals.length} meal${fodmapMeals.length === 1 ? "" : "s"} flagged as high FODMAP`,
      detail: `For example: ${names}.`,
      action: "Swap the flagged ingredient (onion, garlic, wheat, lactose, apple, pear, cashew) for a safe alternative from your saved foods.",
    });
  } else if (logged.length > 0) {
    insights.push({
      severity: "good",
      title: "No high-FODMAP meals flagged",
      detail: "Nothing in your logged meals matched the keywords the app checks. It only knows a short list, so use your own judgement too.",
    });
  }

  // 7. Meal distribution
  const dinner = mealTypeShare.find((m) => m.type === "Dinner");
  if (dinner && dinner.pct > 50 && totalKcal > 0) {
    insights.push({
      severity: "info",
      title: `Dinner holds ${dinner.pct}% of your logged calories`,
      detail: "A big evening meal makes it harder to fuel the day and to recover well.",
      action: "Move part of it earlier: a bigger breakfast or lunch, and a snack in the afternoon.",
    });
  }

  const order = { high: 0, medium: 1, info: 2, good: 3 } as const;
  insights.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    days,
    windowDays,
    loggedDays: logged.length,
    avgKcal,
    avgTargetKcal,
    avgProtein,
    avgTargetProtein,
    mealTypeShare,
    insights,
  };
}

// Compact text for the Coach prompt.
export function nutritionInsightsText(data: NutritionInsights): string[] {
  const lines: string[] = [];
  lines.push(`Logged food on ${data.loggedDays} of the last ${data.windowDays} completed days.`);
  if (data.avgKcal != null && data.avgTargetKcal != null) {
    lines.push(
      `Average on logged days: ${round(data.avgKcal)} kcal (target ${round(data.avgTargetKcal)}), ${round(data.avgProtein ?? 0)} g protein (target ${round(data.avgTargetProtein ?? 0)}).`
    );
  }
  for (const insight of data.insights.filter((i) => i.severity !== "good").slice(0, 5)) {
    lines.push(`- ${insight.title}: ${insight.detail}`);
  }
  return lines;
}

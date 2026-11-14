// Daily calorie/protein targets by training-day intensity, and an optional
// FODMAP keyword check. Targets are a rough starting point, not medical advice.

export type TrainingLoadTier = "rest" | "light" | "moderate" | "heavy";

// Per kg of body weight, so targets scale for athletes of any size.
const TIER_PER_KG: Record<TrainingLoadTier, { kcal: number; carbsG: number }> = {
  rest: { kcal: 34, carbsG: 3 },
  light: { kcal: 38, carbsG: 4 },
  moderate: { kcal: 44, carbsG: 5 },
  heavy: { kcal: 50, carbsG: 6.5 },
};
const PROTEIN_G_PER_KG = 1.8;
export const DEFAULT_WEIGHT_KG = 70;

export function getDailyTargets(tier: TrainingLoadTier, weightKg = DEFAULT_WEIGHT_KG) {
  const perKg = TIER_PER_KG[tier];
  return {
    calories: Math.round((weightKg * perKg.kcal) / 50) * 50,
    carbsG: Math.round((weightKg * perKg.carbsG) / 5) * 5,
    proteinG: Math.round(weightKg * PROTEIN_G_PER_KG),
  };
}

const HIGH_FODMAP_KEYWORDS = [
  "ui",
  "uien",
  "onion",
  "knoflook",
  "garlic",
  "tarwe",
  "wheat",
  "lactose",
  "appel",
  "apple",
  "peer",
  "pear",
  "cashew",
];

export function checkFodmap(description: string): {
  risk: "low" | "high";
  matched: string[];
} {
  // "lactose-free" / "tarwevrij" mean the ingredient is absent, so drop those
  // phrases before looking for keywords.
  const lower = description
    .toLowerCase()
    .replace(
      /\b(lactose|wheat|tarwe|onion|uien|ui|garlic|knoflook|apple|appel|pear|peer|cashew)s?[\s-]?(free|vrij|vrije)\b/g,
      " "
    );
  // Whole-word match (optionally plural) so "fruit"/"juice" don't trip "ui".
  const matched = HIGH_FODMAP_KEYWORDS.filter((word) =>
    new RegExp(`\\b${word}(s|en)?\\b`).test(lower)
  );
  return { risk: matched.length > 0 ? "high" : "low", matched };
}


// Meals linked to a saved food keep that food's own rating; for free-text
// meals the keyword check is the source of truth, so rows stored with an
// older, stricter check are corrected when displayed.
export function effectiveFodmapRisk(meal: {
  fodmapRisk: string;
  description: string;
  safeFoodId?: string | null;
}): "LOW" | "MEDIUM" | "HIGH" {
  if (meal.safeFoodId) return meal.fodmapRisk as "LOW" | "MEDIUM" | "HIGH";
  return checkFodmap(meal.description).risk === "high" ? "HIGH" : "LOW";
}

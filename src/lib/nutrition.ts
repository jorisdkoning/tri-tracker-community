// Daily calorie/protein targets by training-day intensity. Targets are a rough
// starting point, not medical advice.

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

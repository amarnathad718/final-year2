export function estimateCo2SavingsKg(estimatedMeals: number) {
  const kgCo2PerMealSaved = 2.5;
  return Number((estimatedMeals * kgCo2PerMealSaved).toFixed(2));
}

export function estimateWasteReductionKg(estimatedMeals: number) {
  const avgMealWeightKg = 0.45;
  return Number((estimatedMeals * avgMealWeightKg).toFixed(2));
}

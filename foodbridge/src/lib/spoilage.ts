type SpoilageInput = {
  expiryAt: Date;
  temperatureC: number;
  handlingScore: number;
  foodType: string;
};

export type SpoilagePrediction = {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: {
    expiryRisk: number;
    temperatureRisk: number;
    handlingRisk: number;
    foodTypeRisk: number;
  };
  explainability: {
    summary: string;
    topReasons: string[];
  };
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function foodTypeRisk(foodType: string) {
  const normalized = foodType.toLowerCase();
  if (normalized.includes("dairy") || normalized.includes("milk") || normalized.includes("seafood")) return 0.85;
  if (normalized.includes("cooked") || normalized.includes("rice") || normalized.includes("curry")) return 0.65;
  if (normalized.includes("bakery") || normalized.includes("bread")) return 0.45;
  if (normalized.includes("fruit") || normalized.includes("produce") || normalized.includes("vegetable")) return 0.38;
  return 0.5;
}

function riskLevel(score: number): SpoilagePrediction["riskLevel"] {
  if (score >= 0.8) return "CRITICAL";
  if (score >= 0.6) return "HIGH";
  if (score >= 0.35) return "MEDIUM";
  return "LOW";
}

export function predictSpoilageRisk(input: SpoilageInput): SpoilagePrediction {
  const remainingHours = Math.max(0, (input.expiryAt.getTime() - Date.now()) / (1000 * 60 * 60));

  const expiryRisk = clamp(1 - remainingHours / 24);
  const temperatureRisk = clamp((input.temperatureC - 5) / 20);
  const handlingRisk = clamp((5 - input.handlingScore) / 4);
  const foodTypeRiskScore = foodTypeRisk(input.foodType);

  const riskScore = clamp(
    expiryRisk * 0.45 + temperatureRisk * 0.3 + handlingRisk * 0.15 + foodTypeRiskScore * 0.1,
    0,
    1,
  );

  const factors = {
    expiryRisk: Number(expiryRisk.toFixed(3)),
    temperatureRisk: Number(temperatureRisk.toFixed(3)),
    handlingRisk: Number(handlingRisk.toFixed(3)),
    foodTypeRisk: Number(foodTypeRiskScore.toFixed(3)),
  };

  const reasons = [
    { label: `Expiry window risk ${factors.expiryRisk}`, value: factors.expiryRisk },
    { label: `Storage temperature risk ${factors.temperatureRisk} at ${input.temperatureC.toFixed(1)} C`, value: factors.temperatureRisk },
    { label: `Handling quality risk ${factors.handlingRisk} from score ${input.handlingScore}/5`, value: factors.handlingRisk },
    { label: `Food type sensitivity risk ${factors.foodTypeRisk}`, value: factors.foodTypeRisk },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => item.label);

  return {
    riskScore: Number(riskScore.toFixed(3)),
    riskLevel: riskLevel(riskScore),
    factors,
    explainability: {
      summary: `Predicted spoilage risk is ${riskLevel(riskScore)} with score ${riskScore.toFixed(3)}.`,
      topReasons: reasons,
    },
  };
}

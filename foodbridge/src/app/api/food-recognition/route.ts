import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";

type FoodProfile = {
  foodType: string;
  keywords: string[];
  quantityUnit: string;
  temperatureC: number;
  handlingScore: number;
  mealsPerUnit: number;
};

type InspectionSeverity = "LOW" | "MEDIUM" | "HIGH";

type InspectionIssue = {
  id: "SPOILAGE" | "UNDERCOOKED" | "CONTAMINATION" | "PACKAGING_DAMAGE" | "TEMPERATURE_ABUSE" | "NEAR_EXPIRY";
  label: string;
  detected: boolean;
  severity: InspectionSeverity;
  reason: string;
};

const foodProfiles: FoodProfile[] = [
  {
    foodType: "Rice and curry packs",
    keywords: ["rice", "curry", "biryani", "thali", "meal", "dal"],
    quantityUnit: "packs",
    temperatureC: 60,
    handlingScore: 4,
    mealsPerUnit: 2,
  },
  {
    foodType: "Chapati and sabzi packs",
    keywords: ["chapati", "roti", "sabzi", "paratha"],
    quantityUnit: "packs",
    temperatureC: 58,
    handlingScore: 4,
    mealsPerUnit: 2,
  },
  {
    foodType: "Breakfast items",
    keywords: ["idli", "dosa", "poha", "upma", "breakfast"],
    quantityUnit: "boxes",
    temperatureC: 45,
    handlingScore: 4,
    mealsPerUnit: 1,
  },
  {
    foodType: "Snacks",
    keywords: ["snack", "samosa", "sandwich", "roll", "pakora"],
    quantityUnit: "boxes",
    temperatureC: 25,
    handlingScore: 4,
    mealsPerUnit: 1,
  },
  {
    foodType: "Bakery items",
    keywords: ["bread", "cake", "bun", "pastry", "bakery"],
    quantityUnit: "trays",
    temperatureC: 24,
    handlingScore: 4,
    mealsPerUnit: 1,
  },
  {
    foodType: "Dairy products",
    keywords: ["milk", "curd", "paneer", "yogurt", "cheese", "dairy"],
    quantityUnit: "boxes",
    temperatureC: 4,
    handlingScore: 5,
    mealsPerUnit: 1,
  },
  {
    foodType: "Fresh produce",
    keywords: ["fruit", "vegetable", "veggie", "produce", "banana", "apple"],
    quantityUnit: "crates",
    temperatureC: 10,
    handlingScore: 4,
    mealsPerUnit: 3,
  },
  {
    foodType: "Water bottles",
    keywords: ["water", "bottle", "mineral"],
    quantityUnit: "bottles",
    temperatureC: 20,
    handlingScore: 5,
    mealsPerUnit: 1,
  },
  {
    foodType: "Juice packs",
    keywords: ["juice", "tetra", "drink"],
    quantityUnit: "packs",
    temperatureC: 8,
    handlingScore: 4,
    mealsPerUnit: 1,
  },
  {
    foodType: "Baby food",
    keywords: ["baby", "infant", "formula", "cereal"],
    quantityUnit: "packs",
    temperatureC: 5,
    handlingScore: 5,
    mealsPerUnit: 1,
  },
  {
    foodType: "Dry ration kits",
    keywords: ["ration", "kit", "grain", "lentil", "flour", "dry"],
    quantityUnit: "kits",
    temperatureC: 24,
    handlingScore: 4,
    mealsPerUnit: 8,
  },
];

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function detectFoodType(clueText: string) {
  const tokens = tokenize(clueText);
  const tokenSet = new Set(tokens);

  let best: FoodProfile | null = null;
  let bestHits = 0;

  for (const profile of foodProfiles) {
    const hits = profile.keywords.reduce((count, keyword) => {
      return count + (tokenSet.has(keyword) ? 1 : 0);
    }, 0);

    if (hits > bestHits) {
      bestHits = hits;
      best = profile;
    }
  }

  if (!best) {
    return {
      foodType: "Cooked meals",
      quantityUnit: "boxes",
      temperatureC: 8,
      handlingScore: 4,
      mealsPerUnit: 2,
      confidencePct: 34,
    };
  }

  const confidencePct = Math.min(96, 52 + bestHits * 14);
  return {
    foodType: best.foodType,
    quantityUnit: best.quantityUnit,
    temperatureC: best.temperatureC,
    handlingScore: best.handlingScore,
    mealsPerUnit: best.mealsPerUnit,
    confidencePct,
  };
}

function hasAnyToken(tokens: Set<string>, keywords: string[]) {
  return keywords.some((keyword) => tokens.has(keyword));
}

function inspectionSeverityScore(issues: InspectionIssue[]) {
  return issues.reduce((total, issue) => {
    if (!issue.detected) return total;
    if (issue.severity === "HIGH") return total + 40;
    if (issue.severity === "MEDIUM") return total + 22;
    return total + 10;
  }, 0);
}

function perishability(foodType: string) {
  const normalized = foodType.toLowerCase();
  if (normalized.includes("dairy") || normalized.includes("cooked") || normalized.includes("rice") || normalized.includes("curry")) return 1;
  if (normalized.includes("fresh") || normalized.includes("produce") || normalized.includes("juice")) return 0.7;
  return 0.4;
}

function runInspection(input: { clueText: string; foodType: string; temperatureC?: number; expiryAt?: string }) {
  const tokens = new Set(tokenize(input.clueText));
  const remainingHours = input.expiryAt ? (new Date(input.expiryAt).getTime() - Date.now()) / (1000 * 60 * 60) : undefined;
  const isNearExpiry = typeof remainingHours === "number" && Number.isFinite(remainingHours) && remainingHours <= 4;

  const spoilageDetected = hasAnyToken(tokens, ["spoilt", "spoil", "spoiled", "rotten", "stale", "mold", "mould", "fungus", "sour", "expired"]);
  const undercookedDetected = hasAnyToken(tokens, ["raw", "undercooked", "uncooked", "pink", "halfcooked"]);
  const contaminationDetected = hasAnyToken(tokens, ["hair", "fly", "insect", "dirty", "dirt", "dust", "plastic", "metal", "contaminated"]);
  const packagingDamageDetected = hasAnyToken(tokens, ["leak", "leaking", "leakage", "torn", "broken", "open", "damaged", "spilled"]);

  const perishabilityIdx = perishability(input.foodType);
  const temperature = typeof input.temperatureC === "number" && Number.isFinite(input.temperatureC) ? input.temperatureC : undefined;
  const temperatureAbuseDetected =
    typeof temperature === "number" &&
    ((perishabilityIdx >= 1 && temperature > 10) || (perishabilityIdx >= 0.7 && temperature > 14) || (perishabilityIdx < 0.7 && temperature > 26));

  const issues: InspectionIssue[] = [
    {
      id: "SPOILAGE",
      label: "Possible spoilage signs",
      detected: spoilageDetected,
      severity: "HIGH",
      reason: spoilageDetected ? "Image/filename contains spoilage-related cues." : "No direct spoilage cue found in image metadata.",
    },
    {
      id: "UNDERCOOKED",
      label: "Possible undercooked food",
      detected: undercookedDetected,
      severity: "HIGH",
      reason: undercookedDetected ? "Image/filename indicates raw or undercooked cues." : "No undercooked cue found in image metadata.",
    },
    {
      id: "CONTAMINATION",
      label: "Possible contamination risk",
      detected: contaminationDetected,
      severity: "HIGH",
      reason: contaminationDetected ? "Contamination-related cues detected in image metadata." : "No contamination cue found in image metadata.",
    },
    {
      id: "PACKAGING_DAMAGE",
      label: "Packaging damage risk",
      detected: packagingDamageDetected,
      severity: "MEDIUM",
      reason: packagingDamageDetected ? "Packaging damage cues found in image metadata." : "No packaging damage cue found in image metadata.",
    },
    {
      id: "TEMPERATURE_ABUSE",
      label: "Unsafe storage temperature",
      detected: temperatureAbuseDetected,
      severity: "MEDIUM",
      reason: temperatureAbuseDetected ? `Given temperature ${temperature?.toFixed(1)} C seems unsafe for this food category.` : "Temperature appears acceptable for this food category.",
    },
    {
      id: "NEAR_EXPIRY",
      label: "Near expiry window",
      detected: Boolean(isNearExpiry),
      severity: "MEDIUM",
      reason: isNearExpiry ? `Expiry window is short (${Math.max(0, remainingHours ?? 0).toFixed(1)}h remaining).` : "Expiry window is not critically short.",
    },
  ];

  const score = Math.min(100, inspectionSeverityScore(issues));
  const flaggedIssues = issues.filter((issue) => issue.detected);

  const verdict = score >= 70 ? "BLOCK" : score >= 35 ? "REVIEW" : "PASS";
  const verdictMessage =
    verdict === "BLOCK"
      ? "Potentially unsafe food detected. Manual verification required before posting."
      : verdict === "REVIEW"
        ? "Some risk indicators detected. Please review before posting."
        : "No major risk indicators detected from image metadata.";

  return {
    issues,
    flaggedIssues,
    score,
    verdict,
    verdictMessage,
    inspectionMode: "metadata-heuristics",
  };
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 40, 60_000);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "ADMIN"]);
  if (access.error) return access.error;

  const body = await request.json().catch(() => null);
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const expiryAt = typeof body?.expiryAt === "string" ? body.expiryAt : undefined;
  const temperatureC = Number(body?.temperatureC);

  if (!imageUrl && !fileName) {
    return apiError("imageUrl or fileName is required", 422);
  }

  const clueText = `${imageUrl} ${fileName}`;
  const detection = detectFoodType(clueText);
  const inspection = runInspection({
    clueText,
    foodType: detection.foodType,
    temperatureC: Number.isFinite(temperatureC) ? temperatureC : detection.temperatureC,
    expiryAt,
  });
  const quantity = Number(body?.quantity);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 50;

  return apiSuccess({
    foodType: detection.foodType,
    quantityUnit: detection.quantityUnit,
    temperatureC: detection.temperatureC,
    handlingScore: detection.handlingScore,
    confidencePct: detection.confidencePct,
    estimatedMealsSuggestion: Math.max(1, normalizedQuantity * detection.mealsPerUnit),
    source: imageUrl ? "image-url-and-filename" : "filename",
    inspection,
  });
}
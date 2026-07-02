import { DonationStatus } from "@prisma/client";

type TrackableAssignment = {
  id?: string;
  status: DonationStatus | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  startedAt?: Date | string | null;
  distanceKm?: number | null;
  priorityScore?: number | null;
  urgencyMultiplier?: number | null;
  demandMultiplier?: number | null;
  donation?: {
    id?: string;
    foodType?: string;
    estimatedMeals?: number;
    expiryAt?: Date | string;
    spoilageRiskScore?: number;
  };
};

export type DelayRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type EtaSignal = {
  etaMinutes: number | null;
  estimatedArrivalAt: string | null;
  predictedDelayMinutes: number;
  delayProbabilityPct: number;
  delayRisk: DelayRiskLevel;
  alertMessage: string | null;
  confidence: number;
};

function toDate(value?: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function hashToUnitInterval(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function computeTrafficFactor(now: Date) {
  const hour = now.getHours();
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  return isPeak ? 1.35 : 1.08;
}

function foodHandlingFactor(foodType?: string) {
  const normalized = (foodType ?? "").toLowerCase();
  if (normalized.includes("dairy") || normalized.includes("milk") || normalized.includes("curd")) return 1.22;
  if (normalized.includes("meat") || normalized.includes("chicken") || normalized.includes("fish")) return 1.28;
  if (normalized.includes("cooked") || normalized.includes("curry") || normalized.includes("rice")) return 1.16;
  if (normalized.includes("fresh") || normalized.includes("produce") || normalized.includes("vegetable")) return 1.1;
  if (normalized.includes("bakery") || normalized.includes("bread")) return 0.96;
  if (normalized.includes("water") || normalized.includes("bottle") || normalized.includes("dry ration")) return 0.88;
  return 1;
}

function computeBaseEtaMinutes(assignment: TrackableAssignment, now: Date) {
  const status = assignment.status;
  const meals = assignment.donation?.estimatedMeals ?? 80;
  const complexityFactor = foodHandlingFactor(assignment.donation?.foodType);
  const loadFactor = Math.max(0.92, Math.min(1.3, 0.9 + meals / 320));
  const assignmentSeed = hashToUnitInterval(String(assignment.id ?? assignment.donation?.id ?? "fallback-seed"));

  const distanceKm =
    assignment.distanceKm ??
    Math.max(2.8, Math.min(24, 4.2 + meals / 45 + complexityFactor * 1.2 + assignmentSeed * 2.4));

  const baseSpeedKmph = status === DonationStatus.PICKED_UP || status === DonationStatus.IN_TRANSIT ? 24 : 15;
  const trafficFactor = computeTrafficFactor(now);
  const urgencyFactor = assignment.urgencyMultiplier ?? 1;
  const demandFactor = assignment.demandMultiplier ?? 1;

  const multiplier = Math.max(0.82, Math.min(1.6, ((urgencyFactor + demandFactor) / 2) * complexityFactor * loadFactor));
  const travelMinutes = (distanceKm / baseSpeedKmph) * 60 * trafficFactor * multiplier;
  const dispatchBuffer = status === DonationStatus.MATCHED ? 9 + Math.round((0.4 + assignmentSeed) * 6) : 0;

  return Math.max(5, Math.round(travelMinutes + dispatchBuffer));
}

export function buildEtaSignal(assignment: TrackableAssignment, now = new Date()): EtaSignal {
  const status = assignment.status;

  if (status === DonationStatus.DELIVERED) {
    return {
      etaMinutes: 0,
      estimatedArrivalAt: now.toISOString(),
      predictedDelayMinutes: 0,
      delayProbabilityPct: 3,
      delayRisk: "LOW",
      alertMessage: null,
      confidence: 0.99,
    };
  }

  if (status === DonationStatus.CANCELLED || status === DonationStatus.EXPIRED) {
    return {
      etaMinutes: null,
      estimatedArrivalAt: null,
      predictedDelayMinutes: 0,
      delayProbabilityPct: 98,
      delayRisk: "HIGH",
      alertMessage: "Assignment is no longer deliverable.",
      confidence: 0.95,
    };
  }

  const baseEta = computeBaseEtaMinutes(assignment, now);
  const startedAt = toDate(assignment.startedAt) ?? toDate(assignment.updatedAt) ?? toDate(assignment.createdAt);
  const elapsedMinutes = startedAt ? Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 60000)) : 0;
  const remainingEta =
    status === DonationStatus.PICKED_UP || status === DonationStatus.IN_TRANSIT
      ? Math.max(3, baseEta - elapsedMinutes)
      : baseEta;

  const expiryAt = toDate(assignment.donation?.expiryAt);
  const minutesToExpiry = expiryAt ? Math.round((expiryAt.getTime() - now.getTime()) / 60000) : null;
  const priorityScore = assignment.priorityScore ?? 0.6;
  const spoilageRiskScore = assignment.donation?.spoilageRiskScore ?? 0.45;
  const complexityFactor = foodHandlingFactor(assignment.donation?.foodType);

  const scheduleDriftMinutes = Math.max(0, elapsedMinutes - Math.round(baseEta * 0.82));
  const predictedDelayMinutes = Math.max(0, Math.round(scheduleDriftMinutes + (complexityFactor - 1) * 10 + spoilageRiskScore * 8));

  const expiryPressure = minutesToExpiry === null ? 0 : Math.max(0, remainingEta - minutesToExpiry);
  const probabilityRaw =
    predictedDelayMinutes * 1.9 +
    expiryPressure * 1.4 +
    (priorityScore > 0.82 ? 12 : 5) +
    (complexityFactor - 0.85) * 40 +
    spoilageRiskScore * 28;
  const delayProbabilityPct = Math.max(4, Math.min(98, Math.round(probabilityRaw)));

  let delayRisk: DelayRiskLevel = "LOW";
  let alertMessage: string | null = null;

  if (minutesToExpiry !== null && minutesToExpiry <= remainingEta) {
    delayRisk = "HIGH";
    alertMessage = "High delay risk: ETA is beyond safe food window.";
  } else if (delayProbabilityPct >= 65 || predictedDelayMinutes > 14 || remainingEta > 55) {
    delayRisk = "MEDIUM";
    alertMessage = "Potential delay predicted. Consider route or rider reassignment.";
  }

  if (delayProbabilityPct >= 82 || predictedDelayMinutes > 22) {
    delayRisk = "HIGH";
    alertMessage = "High delay probability predicted. Trigger escalation for urgent handling.";
  }

  const confidencePenalty = (delayRisk === "HIGH" ? 0.2 : delayRisk === "MEDIUM" ? 0.11 : 0.05) + Math.min(0.22, delayProbabilityPct / 500);
  const confidence = Math.max(0.52, Number((0.97 - confidencePenalty).toFixed(2)));

  return {
    etaMinutes: remainingEta,
    estimatedArrivalAt: new Date(now.getTime() + remainingEta * 60000).toISOString(),
    predictedDelayMinutes,
    delayProbabilityPct,
    delayRisk,
    alertMessage,
    confidence,
  };
}

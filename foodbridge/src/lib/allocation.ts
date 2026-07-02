import { Donation, User } from "@prisma/client";
import { haversineDistanceKm } from "@/lib/geo";

export type AllocationWeights = {
  distance: number;
  urgency: number;
  trust: number;
  demand: number;
  capacity: number;
};

export const defaultAllocationWeights: AllocationWeights = {
  distance: 0.28,
  urgency: 0.25,
  trust: 0.18,
  demand: 0.19,
  capacity: 0.1,
};

export type AllocationCandidate = {
  userId: string;
  role: "NGO" | "VOLUNTEER";
  distanceKm: number;
  activeAssignments: number;
  componentScores: {
    distance: number;
    urgency: number;
    trust: number;
    demand: number;
    capacity: number;
  };
  weightedContribution: {
    distance: number;
    urgency: number;
    trust: number;
    demand: number;
    capacity: number;
  };
  demandMultiplier: number;
  urgencyMultiplier: number;
  trustMultiplier: number;
  capacityMultiplier: number;
  explainability: {
    summary: string;
    topReasons: string[];
  };
  score: number;
};

type RankCandidatesInput = {
  weights?: Partial<AllocationWeights>;
  activeAssignmentsByUser?: Record<string, number>;
};

function demandModel(lat: number, lng: number) {
  const hungerCoreLat = 12.95;
  const hungerCoreLng = 77.61;
  const distance = haversineDistanceKm(lat, lng, hungerCoreLat, hungerCoreLng);
  return Math.max(0.8, 1.8 - distance / 25);
}

function urgencyMultiplierModel(expiryAt: Date) {
  const remainingHours = Math.max(0.1, (expiryAt.getTime() - Date.now()) / (1000 * 60 * 60));
  if (remainingHours <= 2) return 1.8;
  if (remainingHours <= 5) return 1.5;
  if (remainingHours <= 10) return 1.25;
  return 1;
}

function urgencyScoreModel(expiryAt: Date) {
  const remainingHours = Math.max(0.1, (expiryAt.getTime() - Date.now()) / (1000 * 60 * 60));
  return Math.min(1, 10 / (remainingHours + 1));
}

function distanceScoreModel(distanceKm: number) {
  return 1 / (1 + distanceKm / 5);
}

function normalizeWeights(input?: Partial<AllocationWeights>) {
  const merged = {
    ...defaultAllocationWeights,
    ...input,
  };

  const sum = merged.distance + merged.urgency + merged.trust + merged.demand + merged.capacity;
  if (sum <= 0) return defaultAllocationWeights;

  return {
    distance: merged.distance / sum,
    urgency: merged.urgency / sum,
    trust: merged.trust / sum,
    demand: merged.demand / sum,
    capacity: merged.capacity / sum,
  } satisfies AllocationWeights;
}

function capacityLimit(role: "NGO" | "VOLUNTEER") {
  return role === "NGO" ? 8 : 4;
}

function capacityScoreModel(role: "NGO" | "VOLUNTEER", activeAssignments: number) {
  const limit = capacityLimit(role);
  const loadRatio = Math.min(1, activeAssignments / limit);
  return 1 - loadRatio;
}

export function rankCandidates(donation: Donation, candidates: User[], input: RankCandidatesInput = {}) {
  const weights = normalizeWeights(input.weights);
  const urgencyMultiplier = urgencyMultiplierModel(donation.expiryAt);
  const urgencyScore = urgencyScoreModel(donation.expiryAt);

  const ranked = candidates
    .filter((user) => typeof user.lat === "number" && typeof user.lng === "number")
    .map((user) => {
      const role = user.role as "NGO" | "VOLUNTEER";
      const distanceKm = haversineDistanceKm(donation.lat, donation.lng, user.lat as number, user.lng as number);
      const demandMultiplier = demandModel(user.lat as number, user.lng as number);
      const trustMultiplier = Math.max(0.8, user.trustScore / 5);
      const activeAssignments = input.activeAssignmentsByUser?.[user.id] ?? 0;

      const componentScores = {
        distance: distanceScoreModel(distanceKm),
        urgency: urgencyScore,
        trust: Math.min(1, Math.max(0, user.trustScore / 5)),
        demand: Math.min(1, Math.max(0, (demandMultiplier - 0.8) / 1.0)),
        capacity: capacityScoreModel(role, activeAssignments),
      };

      const weightedContribution = {
        distance: componentScores.distance * weights.distance,
        urgency: componentScores.urgency * weights.urgency,
        trust: componentScores.trust * weights.trust,
        demand: componentScores.demand * weights.demand,
        capacity: componentScores.capacity * weights.capacity,
      };

      const score =
        weightedContribution.distance +
        weightedContribution.urgency +
        weightedContribution.trust +
        weightedContribution.demand +
        weightedContribution.capacity;

      const reasons = [
        { key: "distance", text: `Distance ${distanceKm.toFixed(1)} km`, value: weightedContribution.distance },
        { key: "urgency", text: `Urgency multiplier ${urgencyMultiplier.toFixed(2)}`, value: weightedContribution.urgency },
        { key: "trust", text: `Trust score ${user.trustScore.toFixed(2)}/5`, value: weightedContribution.trust },
        { key: "demand", text: `Demand multiplier ${demandMultiplier.toFixed(2)}`, value: weightedContribution.demand },
        {
          key: "capacity",
          text: `Active assignments ${activeAssignments}/${capacityLimit(role)}`,
          value: weightedContribution.capacity,
        },
      ]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((item) => item.text);

      return {
        userId: user.id,
        role,
        distanceKm,
        activeAssignments,
        componentScores,
        weightedContribution,
        demandMultiplier,
        urgencyMultiplier,
        trustMultiplier,
        capacityMultiplier: 1 + componentScores.capacity,
        explainability: {
          summary: `Score ${score.toFixed(3)} computed using weighted distance, urgency, trust, demand, and capacity.`,
          topReasons: reasons,
        },
        score,
      } satisfies AllocationCandidate;
    })
    .sort((a, b) => b.score - a.score);

  return ranked;
}

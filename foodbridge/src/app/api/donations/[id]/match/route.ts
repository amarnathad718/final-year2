import { DonationStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { defaultAllocationWeights, rankCandidates } from "@/lib/allocation";
import { prisma } from "@/lib/db";
import { addDemoAssignment, demoDonations, demoUsers, isDemoMode } from "@/lib/demo";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { allocationWeightsSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(request);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["NGO", "ADMIN", "VOLUNTEER"]);
  if (access.error) return access.error;

  let requestedWeights = undefined;
  try {
    const raw = await request.text();
    if (raw) {
      const parsedJson = JSON.parse(raw) as unknown;
      const parsedWeights = allocationWeightsSchema.safeParse(parsedJson);
      if (!parsedWeights.success) {
        return apiError("Invalid allocation weights", 422, parsedWeights.error.flatten());
      }
      requestedWeights = parsedWeights.data;
    }
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { id } = await context.params;

  if (isDemoMode) {
    const donation = demoDonations().find((item) => item.id === id);
    if (!donation) return apiError("Donation not found", 404);

    const ngo = demoUsers.find((user) => user.role === "NGO");
    const volunteer = demoUsers.find((user) => user.role === "VOLUNTEER");

    const assignment = addDemoAssignment({
      donation,
      ngoId: ngo?.id,
      ngoName: ngo?.name,
      volunteerId: volunteer?.id,
      volunteerName: volunteer?.name,
      priorityScore: 0.91,
      distanceKm: 3.1,
    });

    return apiSuccess({
      assignment,
      rankedCandidates: [
        {
          userId: "demo-ngo",
          role: "NGO",
          distanceKm: 3.1,
          activeAssignments: 2,
          componentScores: {
            distance: 0.61,
            urgency: 0.75,
            trust: 0.92,
            demand: 0.62,
            capacity: 0.75,
          },
          weightedContribution: {
            distance: 0.17,
            urgency: 0.19,
            trust: 0.16,
            demand: 0.12,
            capacity: 0.08,
          },
          demandMultiplier: 1.4,
          urgencyMultiplier: 1.3,
          trustMultiplier: 0.9,
          capacityMultiplier: 1.75,
          explainability: {
            summary: "Score computed using weighted distance, urgency, trust, demand, and capacity.",
            topReasons: ["Trust score 4.6/5", "Distance 3.1 km", "Active assignments 2/8"],
          },
          score: 0.91,
        },
      ],
      model: {
        weights: requestedWeights ?? defaultAllocationWeights,
      },
    });
  }

  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) return apiError("Donation not found", 404);

  const candidates = await prisma.user.findMany({
    where: {
      role: { in: ["NGO", "VOLUNTEER"] },
      isVerified: true,
    },
  });

  const activeStatuses = [DonationStatus.MATCHED, DonationStatus.PICKED_UP, DonationStatus.IN_TRANSIT];
  const [ngoLoadRows, volunteerLoadRows] = await Promise.all([
    prisma.assignment.groupBy({
      by: ["ngoId"],
      where: {
        ngoId: { not: null },
        status: { in: activeStatuses },
      },
      _count: { _all: true },
    }),
    prisma.assignment.groupBy({
      by: ["volunteerId"],
      where: {
        volunteerId: { not: null },
        status: { in: activeStatuses },
      },
      _count: { _all: true },
    }),
  ]);

  const activeAssignmentsByUser: Record<string, number> = {};
  for (const row of ngoLoadRows) {
    if (row.ngoId) activeAssignmentsByUser[row.ngoId] = row._count._all;
  }
  for (const row of volunteerLoadRows) {
    if (row.volunteerId) activeAssignmentsByUser[row.volunteerId] = row._count._all;
  }

  const ranked = rankCandidates(donation, candidates, {
    weights: requestedWeights,
    activeAssignmentsByUser,
  });
  if (!ranked.length) return apiError("No available verified NGO/volunteer found", 404);

  const best = ranked[0];

  const assignment = await prisma.assignment.create({
    data: {
      donationId: donation.id,
      ngoId: best.role === "NGO" ? best.userId : null,
      volunteerId: best.role === "VOLUNTEER" ? best.userId : null,
      assignedBy: access.session.user.id,
      status: DonationStatus.MATCHED,
      priorityScore: best.score,
      distanceKm: best.distanceKm,
      demandMultiplier: best.demandMultiplier,
      urgencyMultiplier: best.urgencyMultiplier,
      routePlanJson: {
        strategy: "weighted-explainable-allocation",
        explainability: best.explainability,
        modelWeights: requestedWeights ?? defaultAllocationWeights,
        checkpoints: [
          { label: "pickup", lat: donation.lat, lng: donation.lng },
          { label: "delivery-hub", candidateId: best.userId },
        ],
      },
    },
    include: {
      ngo: { select: { id: true, name: true } },
      volunteer: { select: { id: true, name: true } },
    },
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { status: DonationStatus.MATCHED },
  });

  return apiSuccess({
    assignment,
    rankedCandidates: ranked.slice(0, 5),
    model: {
      weights: requestedWeights ?? defaultAllocationWeights,
      features: ["distance", "urgency", "trust", "demand", "capacity"],
    },
  });
}

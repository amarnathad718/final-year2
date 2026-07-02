import { DonationStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { addDemoDonation, demoDonations, isDemoMode } from "@/lib/demo";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { predictSpoilageRisk } from "@/lib/spoilage";
import { donationSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const rl = rateLimit(request);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  if (isDemoMode) {
    return apiSuccess(demoDonations());
  }

  const donations = await prisma.donation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      donor: { select: { id: true, name: true, organization: true, trustScore: true } },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          ngo: { select: { id: true, name: true } },
          volunteer: { select: { id: true, name: true } },
        },
      },
    },
  });

  return apiSuccess(donations);
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "ADMIN"]);
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = donationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid donation payload", 422, parsed.error.flatten());
  }

  const spoilagePrediction = predictSpoilageRisk({
    expiryAt: new Date(parsed.data.expiryAt),
    temperatureC: parsed.data.temperatureC,
    handlingScore: parsed.data.handlingScore,
    foodType: parsed.data.foodType,
  });

  if (isDemoMode) {
    const donation = addDemoDonation({
      donorId: access.session.user.id,
      foodType: parsed.data.foodType,
      quantity: parsed.data.quantity,
      quantityUnit: parsed.data.quantityUnit,
      estimatedMeals: parsed.data.estimatedMeals,
      expiryAt: new Date(parsed.data.expiryAt).toISOString(),
      pickupAddress: parsed.data.pickupAddress,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      imageUrl: parsed.data.imageUrl,
      notes: parsed.data.notes,
      spoilageRiskScore: spoilagePrediction.riskScore,
      status: "POSTED",
    });

    return apiSuccess(
      {
        donation,
        spoilagePrediction,
      },
      201,
    );
  }

  const donation = await prisma.donation.create({
    data: {
      donorId: access.session.user.id,
      foodType: parsed.data.foodType,
      quantity: parsed.data.quantity,
      quantityUnit: parsed.data.quantityUnit,
      estimatedMeals: parsed.data.estimatedMeals,
      expiryAt: new Date(parsed.data.expiryAt),
      pickupAddress: parsed.data.pickupAddress,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      imageUrl: parsed.data.imageUrl,
      notes: parsed.data.notes,
      status: DonationStatus.POSTED,
      spoilageRiskScore: spoilagePrediction.riskScore,
      predictedDemandIdx: 1,
    },
  });

  return apiSuccess({ donation, spoilagePrediction }, 201);
}

import { DonationStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { statusSchema } from "@/lib/validation";
import { NextRequest } from "next/server";
import { buildEtaSignal } from "@/lib/eta";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(request);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid status", 422, parsed.error.flatten());

  const { id } = await context.params;

  const assignment = await prisma.assignment.findUnique({ where: { id } });
  if (!assignment) return apiError("Assignment not found", 404);

  const status = parsed.data.status as DonationStatus;

  const updatedAssignment = await prisma.assignment.update({
    where: { id },
    data: {
      status,
      startedAt: status === DonationStatus.PICKED_UP ? new Date() : assignment.startedAt,
      deliveredAt: status === DonationStatus.DELIVERED ? new Date() : assignment.deliveredAt,
    },
  });

  await prisma.donation.update({
    where: { id: assignment.donationId },
    data: { status },
  });

  return apiSuccess(updatedAssignment);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const rl = rateLimit(request);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const { id } = await context.params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      donation: true,
      ngo: { select: { id: true, name: true } },
      volunteer: { select: { id: true, name: true } },
    },
  });

  if (!assignment) return apiError("Assignment not found", 404);

  const etaSignal = buildEtaSignal(assignment);

  return apiSuccess({
    assignment,
    tracking: {
      status: assignment.status,
      updatedAt: assignment.updatedAt,
      ...etaSignal,
    },
  });
}

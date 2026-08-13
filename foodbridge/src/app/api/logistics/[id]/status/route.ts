import { DonationStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { statusSchema } from "@/lib/validation";
import { NextRequest } from "next/server";
import { buildEtaSignal } from "@/lib/eta";
import { sendNotification, notificationTemplates } from "@/lib/notifications";
import { updateAssignment } from "@/lib/socket";

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

  const assignment = await prisma.assignment.findUnique({ 
    where: { id },
    include: {
      donation: { select: { id: true, foodType: true, donorId: true } },
      ngo: { select: { id: true, name: true } },
      volunteer: { select: { id: true, name: true, email: true, phone: true } },
    }
  });

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

  // Send notifications based on status change
  try {
    const notificationPayload = {
      donationFood: assignment.donation.foodType,
      ngoName: assignment.ngo?.name || "Partner Organization",
      volunteerName: assignment.volunteer?.name || "Volunteer",
    };

    if (status === DonationStatus.PICKED_UP) {
      if (assignment.donation.donorId) {
        await sendNotification({
          userId: assignment.donation.donorId,
          type: "DONATION_PICKED_UP",
          title: "Pickup Confirmed ✅",
          body: `Your ${notificationPayload.donationFood} donation has been picked up by ${notificationPayload.volunteerName}.`,
          relatedId: assignment.donationId,
        });
      }
    } else if (status === DonationStatus.IN_TRANSIT) {
      if (assignment.ngo?.id) {
        await sendNotification({
          userId: assignment.ngo.id,
          type: "DONATION_IN_TRANSIT",
          title: "Donation In Transit 🚚",
          body: `${notificationPayload.donationFood} is on its way to your location.`,
          relatedId: assignment.donationId,
        });
      }
    } else if (status === DonationStatus.DELIVERED) {
      const notifyIds = [
        assignment.donation.donorId,
        assignment.ngo?.id,
      ].filter(Boolean) as string[];

      for (const userId of notifyIds) {
        await sendNotification({
          userId,
          type: "DONATION_DELIVERED",
          title: "Delivery Complete! 🎉",
          body: `${notificationPayload.donationFood} has been successfully delivered.`,
          relatedId: assignment.donationId,
        });
      }
    }
  } catch (notificationError) {
    console.error("Error sending notification:", notificationError);
    // Don't fail the request if notification fails
  }

  // Emit WebSocket update
  try {
    updateAssignment(id, {
      status,
      updatedAt: new Date(),
      assignment: updatedAssignment,
    });
  } catch (socketError) {
    console.error("Error emitting socket update:", socketError);
  }

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

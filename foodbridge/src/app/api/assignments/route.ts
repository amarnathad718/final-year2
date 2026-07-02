import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { demoAssignments, isDemoMode } from "@/lib/demo";
import { buildEtaSignal } from "@/lib/eta";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  if (isDemoMode) {
    const enrichedDemo = demoAssignments().map((assignment) => ({
      ...assignment,
      tracking: buildEtaSignal(assignment),
    }));

    return apiSuccess(enrichedDemo);
  }

  const assignments = await prisma.assignment.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      donation: {
        select: {
          id: true,
          foodType: true,
          estimatedMeals: true,
          pickupAddress: true,
          expiryAt: true,
          spoilageRiskScore: true,
          status: true,
        },
      },
      ngo: { select: { id: true, name: true } },
      volunteer: { select: { id: true, name: true } },
    },
  });

  const enriched = assignments.map((assignment) => ({
    ...assignment,
    tracking: buildEtaSignal(assignment),
  }));

  return apiSuccess(enriched);
}

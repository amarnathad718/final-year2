import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function GET() {
  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const notifications = await prisma.notification.findMany({
    where: { userId: access.session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return apiSuccess(notifications);
}

import { apiSuccess, apiError } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { markNotificationAsRead } from "@/lib/notifications";

export async function PATCH(req: Request) {
  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  try {
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return apiError(400, "Missing notificationId");
    }

    const updated = await markNotificationAsRead(notificationId);
    return apiSuccess({ success: true, notification: updated });
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : "Failed to update notification");
  }
}

import { apiSuccess, apiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { sendNotification, markNotificationAsRead, getUserNotifications } from "@/lib/notifications";
import { notifyUser } from "@/lib/socket";

export async function GET() {
  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const unreadOnly = false; // can be passed as query param

  const notifications = await getUserNotifications(access.session.user.id, unreadOnly);

  return apiSuccess({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  });
}

export async function POST(req: Request) {
  const access = await requireRole(["ADMIN"]);
  if (access.error) return access.error;

  try {
    const body = await req.json();
    const { userId, title, body: messageBody, type, channels } = body;

    if (!userId || !title || !messageBody || !type) {
      return apiError(400, "Missing required fields: userId, title, body, type");
    }

    // Send notification through specified channels
    const result = await sendNotification(
      { userId, title, body: messageBody, type },
      { email: channels?.email !== false, sms: channels?.sms === true, inApp: true }
    );

    // Emit via WebSocket in real-time
    notifyUser(userId, "notification", {
      title,
      body: messageBody,
      type,
      timestamp: new Date(),
    });

    return apiSuccess({ success: true, message: "Notification sent" });
  } catch (error) {
    console.error("Error sending notification:", error);
    return apiError(500, error instanceof Error ? error.message : "Failed to send notification");
  }
}


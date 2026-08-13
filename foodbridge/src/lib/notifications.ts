import nodemailer from "nodemailer";
import { Twilio } from "twilio";
import { prisma } from "./db";

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Twilio SMS configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export type NotificationType =
  | "DONATION_MATCHED"
  | "DONATION_PICKED_UP"
  | "DONATION_IN_TRANSIT"
  | "DONATION_DELIVERED"
  | "ASSIGNMENT_CREATED"
  | "STATUS_UPDATE"
  | "DELAY_ALERT"
  | "SPOILAGE_RISK";

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string; // donation or assignment ID
  data?: Record<string, any>;
}

export interface SendOptions {
  email?: boolean;
  sms?: boolean;
  inApp?: boolean;
}

/**
 * Send multi-channel notification (Email, SMS, In-App)
 */
export async function sendNotification(
  payload: NotificationPayload,
  options: SendOptions = { email: true, sms: false, inApp: true }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new Error(`User not found: ${payload.userId}`);
    }

    // Save to database (in-app notification)
    if (options.inApp) {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          body: payload.body,
        },
      });
    }

    // Send email
    if (options.email && user.email) {
      await sendEmail(user.email, payload.title, payload.body, payload.data);
    }

    // Send SMS
    if (options.sms && user.phone && twilioClient) {
      await sendSMS(user.phone, payload.title, payload.body);
    }

    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmail(
  email: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  if (!process.env.SMTP_USER) {
    console.warn("SMTP_USER not configured, skipping email");
    return;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50; margin-top: 0;">${title}</h2>
        <p style="color: #34495e; line-height: 1.6;">${body}</p>
        ${data?.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; background-color: #e8b559; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">View Details</a>` : ""}
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">FoodBridge - Smart Food Redistribution Network</p>
      </div>
    </div>
  `;

  await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: title,
    html: htmlContent,
  });

  console.log(`Email sent to ${email}`);
}

/**
 * Send SMS notification
 */
async function sendSMS(phone: string, title: string, body: string) {
  if (!twilioClient) {
    console.warn("Twilio not configured, skipping SMS");
    return;
  }

  const message = `${title}: ${body}`.substring(0, 160);

  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });

  console.log(`SMS sent to ${phone}`);
}

/**
 * Get user's notifications (in-app)
 */
export async function getUserNotifications(userId: string, unreadOnly = false) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Create bulk notifications for multiple users
 */
export async function sendBulkNotification(
  userIds: string[],
  payload: Omit<NotificationPayload, "userId">,
  options?: SendOptions
) {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendNotification(
        { ...payload, userId },
        options
      )
    )
  );

  return {
    total: userIds.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

/**
 * Predefined notification templates
 */
export const notificationTemplates = {
  donationMatched: (donationFood: string, ngoName: string): NotificationPayload => ({
    userId: "", // will be overridden
    type: "DONATION_MATCHED",
    title: "Donation Matched! 🎉",
    body: `Your ${donationFood} donation has been matched with ${ngoName}.`,
  }),

  donationPickedUp: (donationFood: string): NotificationPayload => ({
    userId: "",
    type: "DONATION_PICKED_UP",
    title: "Pickup Confirmed ✅",
    body: `Your ${donationFood} donation has been picked up and is on its way.`,
  }),

  delayAlert: (foodType: string, delay: number): NotificationPayload => ({
    userId: "",
    type: "DELAY_ALERT",
    title: "Delivery Delay Alert ⚠️",
    body: `Expected delay of ${delay} minutes for ${foodType} delivery.`,
  }),

  spoilageRisk: (foodType: string, riskLevel: string): NotificationPayload => ({
    userId: "",
    type: "SPOILAGE_RISK",
    title: "High Spoilage Risk 🚨",
    body: `${foodType} has ${riskLevel} spoilage risk. Prioritize delivery immediately.`,
  }),

  assignmentCreated: (foodType: string, address: string): NotificationPayload => ({
    userId: "",
    type: "ASSIGNMENT_CREATED",
    title: "New Assignment 📦",
    body: `You have been assigned to deliver ${foodType} to ${address}.`,
  }),
};

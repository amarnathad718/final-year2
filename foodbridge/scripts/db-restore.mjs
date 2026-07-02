import fs from "fs";
import path from "path";
import process from "process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function pickLatestBackup(backupDir) {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith("foodbridge-backup-") && file.endsWith(".json"))
    .sort();

  if (!files.length) return null;
  return path.join(backupDir, files[files.length - 1]);
}

function toDate(value) {
  return value ? new Date(value) : null;
}

async function main() {
  const projectRoot = process.cwd();
  const backupDir = path.join(projectRoot, "backups");
  const requestedFile = getArg("--file");
  const backupFile = requestedFile ? path.resolve(projectRoot, requestedFile) : pickLatestBackup(backupDir);

  if (!backupFile || !fs.existsSync(backupFile)) {
    throw new Error("No backup file found. Create one with: npm run db:backup");
  }

  const parsed = JSON.parse(fs.readFileSync(backupFile, "utf8"));
  const data = parsed?.data;
  if (!data) {
    throw new Error("Invalid backup file format.");
  }

  const users = Array.isArray(data.users) ? data.users : [];
  const donations = Array.isArray(data.donations) ? data.donations : [];
  const assignments = Array.isArray(data.assignments) ? data.assignments : [];
  const ratings = Array.isArray(data.ratings) ? data.ratings : [];
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];
  const verifications = Array.isArray(data.verifications) ? data.verifications : [];

  await prisma.$transaction(async (tx) => {
    await tx.rating.deleteMany();
    await tx.assignment.deleteMany();
    await tx.notification.deleteMany();
    await tx.verification.deleteMany();
    await tx.donation.deleteMany();
    await tx.user.deleteMany();

    if (users.length) {
      await tx.user.createMany({
        data: users.map((user) => ({
          ...user,
          createdAt: toDate(user.createdAt),
          updatedAt: toDate(user.updatedAt),
        })),
      });
    }

    if (donations.length) {
      await tx.donation.createMany({
        data: donations.map((donation) => ({
          ...donation,
          expiryAt: toDate(donation.expiryAt),
          createdAt: toDate(donation.createdAt),
          updatedAt: toDate(donation.updatedAt),
        })),
      });
    }

    if (assignments.length) {
      await tx.assignment.createMany({
        data: assignments.map((assignment) => ({
          ...assignment,
          startedAt: toDate(assignment.startedAt),
          deliveredAt: toDate(assignment.deliveredAt),
          createdAt: toDate(assignment.createdAt),
          updatedAt: toDate(assignment.updatedAt),
        })),
      });
    }

    if (ratings.length) {
      await tx.rating.createMany({
        data: ratings.map((rating) => ({
          ...rating,
          createdAt: toDate(rating.createdAt),
        })),
      });
    }

    if (notifications.length) {
      await tx.notification.createMany({
        data: notifications.map((notification) => ({
          ...notification,
          createdAt: toDate(notification.createdAt),
        })),
      });
    }

    if (verifications.length) {
      await tx.verification.createMany({
        data: verifications.map((verification) => ({
          ...verification,
          createdAt: toDate(verification.createdAt),
        })),
      });
    }
  });

  console.log(`[FoodBridge] Restore completed from: ${backupFile}`);
  console.log(`[FoodBridge] Restored rows: users=${users.length}, donations=${donations.length}, assignments=${assignments.length}`);
}

main()
  .catch((error) => {
    console.error("[FoodBridge] Restore failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

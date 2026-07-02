import fs from "fs";
import path from "path";
import process from "process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

async function main() {
  const projectRoot = process.cwd();
  const backupDir = path.join(projectRoot, "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const [users, donations, assignments, ratings, notifications, verifications] = await Promise.all([
    prisma.user.findMany(),
    prisma.donation.findMany(),
    prisma.assignment.findMany(),
    prisma.rating.findMany(),
    prisma.notification.findMany(),
    prisma.verification.findMany(),
  ]);

  const snapshot = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "foodbridge-prisma-backup",
      version: 1,
      counts: {
        users: users.length,
        donations: donations.length,
        assignments: assignments.length,
        ratings: ratings.length,
        notifications: notifications.length,
        verifications: verifications.length,
      },
    },
    data: {
      users,
      donations,
      assignments,
      ratings,
      notifications,
      verifications,
    },
  };

  const backupFile = path.join(backupDir, `foodbridge-backup-${timestamp()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`[FoodBridge] Backup created: ${backupFile}`);
  console.log(`[FoodBridge] Rows backed up: users=${users.length}, donations=${donations.length}, assignments=${assignments.length}`);
}

main()
  .catch((error) => {
    console.error("[FoodBridge] Backup failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

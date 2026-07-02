import { DonationStatus } from "@prisma/client";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { demoAnalytics, isDemoMode } from "@/lib/demo";
import { estimateCo2SavingsKg, estimateWasteReductionKg } from "@/lib/impact";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

type TrendBucket = {
  label: string;
  donations: number;
  meals: number;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function areaFromAddress(address: string) {
  const [head] = address.split(",");
  return head.trim() || "Unknown area";
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, 120, 60_000);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["ADMIN", "NGO"]);
  if (access.error) return access.error;

  if (isDemoMode) {
    return apiSuccess(demoAnalytics());
  }

  const [totalDonations, deliveredDonations, users, mealsAgg] = await Promise.all([
    prisma.donation.count(),
    prisma.donation.count({ where: { status: DonationStatus.DELIVERED } }),
    prisma.user.count(),
    prisma.donation.aggregate({ _sum: { estimatedMeals: true } }),
  ]);

  const estimatedMeals = mealsAgg._sum.estimatedMeals ?? 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [heatmap, recentDonations, monthlyDonations] = await Promise.all([
    prisma.donation.findMany({
      where: { status: { in: [DonationStatus.MATCHED, DonationStatus.DELIVERED] } },
      select: { id: true, lat: true, lng: true, estimatedMeals: true, status: true },
      take: 200,
    }),
    prisma.donation.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        id: true,
        createdAt: true,
        estimatedMeals: true,
        pickupAddress: true,
        status: true,
      },
    }),
    prisma.donation.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: {
        id: true,
        createdAt: true,
        estimatedMeals: true,
      },
    }),
  ]);

  const weeklyTrend: TrendBucket[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const label = day.toLocaleDateString("en-US", { weekday: "short" });

    const dayRecords = recentDonations.filter(
      (record) => record.createdAt >= dayStart && record.createdAt < dayEnd,
    );

    weeklyTrend.push({
      label,
      donations: dayRecords.length,
      meals: dayRecords.reduce((sum, record) => sum + record.estimatedMeals, 0),
    });
  }

  const monthlyTrend: TrendBucket[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const label = monthStart.toLocaleDateString("en-US", { month: "short" });

    const monthRecords = monthlyDonations.filter(
      (record) => record.createdAt >= monthStart && record.createdAt < nextMonthStart,
    );

    monthlyTrend.push({
      label,
      donations: monthRecords.length,
      meals: monthRecords.reduce((sum, record) => sum + record.estimatedMeals, 0),
    });
  }

  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const record of recentDonations) {
    const hour = record.createdAt.getHours();
    hourlyBuckets[hour].count += 1;
  }
  const peakDonationTimes = hourlyBuckets
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .sort((a, b) => a.hour - b.hour);

  const areaMap = new Map<string, { pendingMeals: number; fulfilledMeals: number }>();
  for (const record of recentDonations) {
    const area = areaFromAddress(record.pickupAddress);
    const current = areaMap.get(area) ?? { pendingMeals: 0, fulfilledMeals: 0 };

    if (record.status === DonationStatus.DELIVERED) {
      current.fulfilledMeals += record.estimatedMeals;
    } else {
      current.pendingMeals += record.estimatedMeals;
    }

    areaMap.set(area, current);
  }

  const areasNeedingHelp = [...areaMap.entries()]
    .map(([area, values]) => {
      const netNeed = values.pendingMeals - values.fulfilledMeals * 0.45;
      return {
        area,
        needScore: Math.max(0, Math.min(100, Math.round(netNeed / 14))),
        pendingMeals: values.pendingMeals,
        fulfilledMeals: values.fulfilledMeals,
      };
    })
    .sort((a, b) => b.needScore - a.needScore)
    .slice(0, 5);

  const data = {
    totalDonations,
    deliveredDonations,
    activeParticipants: users,
    beneficiaries: estimatedMeals,
    wasteReductionKg: estimateWasteReductionKg(estimatedMeals),
    co2SavingsKg: estimateCo2SavingsKg(estimatedMeals),
    impactScore: Number((deliveredDonations / Math.max(1, totalDonations)).toFixed(2)),
    heatmap,
    weeklyTrend,
    monthlyTrend,
    peakDonationTimes,
    areasNeedingHelp,
  };

  return apiSuccess(data);
}

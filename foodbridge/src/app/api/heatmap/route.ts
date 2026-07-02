import { DonationStatus } from "@prisma/client";
import { apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { demoAnalytics, isDemoMode } from "@/lib/demo";
import { requireRole } from "@/lib/rbac";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type HeatPoint = {
  id: string;
  lat: number;
  lng: number;
  estimatedMeals: number;
  status: DonationStatus | string;
  createdAt: string;
  severity: Severity;
  severityScore: number;
};

function statusSeverityMultiplier(status: DonationStatus | string) {
  switch (status) {
    case DonationStatus.POSTED:
      return 1.2;
    case DonationStatus.MATCHED:
      return 1.05;
    case DonationStatus.PICKED_UP:
      return 0.98;
    case DonationStatus.IN_TRANSIT:
      return 0.94;
    case DonationStatus.DELIVERED:
      return 0.78;
    default:
      return 1;
  }
}

function resolveSeverity(score: number): Severity {
  if (score >= 120) return "CRITICAL";
  if (score >= 80) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

function toHeatPoint(input: {
  id: string;
  lat: number;
  lng: number;
  estimatedMeals: number;
  status: DonationStatus | string;
  createdAt: Date | string;
}): HeatPoint {
  const severityScore = Math.round(input.estimatedMeals * statusSeverityMultiplier(input.status));
  return {
    id: input.id,
    lat: input.lat,
    lng: input.lng,
    estimatedMeals: input.estimatedMeals,
    status: input.status,
    createdAt: input.createdAt instanceof Date ? input.createdAt.toISOString() : new Date(input.createdAt).toISOString(),
    severityScore,
    severity: resolveSeverity(severityScore),
  };
}

function buildTrendFrames(points: HeatPoint[]) {
  const frames = [];
  const intervalHours = 3;
  const frameCount = 8;
  const now = new Date();

  for (let index = frameCount - 1; index >= 0; index -= 1) {
    const frameEnd = new Date(now.getTime() - index * intervalHours * 60 * 60 * 1000);
    const frameStart = new Date(frameEnd.getTime() - intervalHours * 60 * 60 * 1000);

    const framePoints = points.filter((point) => {
      const at = new Date(point.createdAt).getTime();
      return at >= frameStart.getTime() && at <= frameEnd.getTime();
    });

    const severityCounts = {
      LOW: framePoints.filter((point) => point.severity === "LOW").length,
      MEDIUM: framePoints.filter((point) => point.severity === "MEDIUM").length,
      HIGH: framePoints.filter((point) => point.severity === "HIGH").length,
      CRITICAL: framePoints.filter((point) => point.severity === "CRITICAL").length,
    };

    frames.push({
      index: frameCount - 1 - index,
      label: `${frameStart.getHours().toString().padStart(2, "0")}:00-${frameEnd
        .getHours()
        .toString()
        .padStart(2, "0")}:00`,
      startAt: frameStart.toISOString(),
      endAt: frameEnd.toISOString(),
      pointCount: framePoints.length,
      severityCounts,
      points: framePoints,
    });
  }

  return {
    intervalHours,
    frames,
  };
}

export async function GET() {
  const access = await requireRole(["ADMIN", "NGO"]);
  if (access.error) return access.error;

  if (isDemoMode) {
    const demoPoints = demoAnalytics().heatmap.map((point, index) =>
      toHeatPoint({
        ...point,
        createdAt: new Date(Date.now() - ((index % 8) + 1) * 2 * 60 * 60 * 1000),
      }),
    );

    return apiSuccess({
      points: demoPoints,
      trend: buildTrendFrames(demoPoints),
      generatedAt: new Date().toISOString(),
    });
  }

  const records = await prisma.donation.findMany({
    where: { status: { in: [DonationStatus.POSTED, DonationStatus.MATCHED, DonationStatus.DELIVERED] } },
    select: {
      id: true,
      lat: true,
      lng: true,
      estimatedMeals: true,
      status: true,
      createdAt: true,
    },
    take: 500,
  });

  const points = records.map((record) => toHeatPoint(record));

  return apiSuccess({
    points,
    trend: buildTrendFrames(points),
    generatedAt: new Date().toISOString(),
  });
}

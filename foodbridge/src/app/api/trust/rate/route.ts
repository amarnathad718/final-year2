import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { ratingSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 40, 60_000);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) return apiError("Invalid rating", 422, parsed.error.flatten());

  const rating = await prisma.rating.upsert({
    where: {
      raterId_rateeId: {
        raterId: access.session.user.id,
        rateeId: parsed.data.rateeId,
      },
    },
    create: {
      raterId: access.session.user.id,
      rateeId: parsed.data.rateeId,
      score: parsed.data.score,
      comment: parsed.data.comment,
    },
    update: {
      score: parsed.data.score,
      comment: parsed.data.comment,
    },
  });

  const agg = await prisma.rating.aggregate({
    where: { rateeId: parsed.data.rateeId },
    _avg: { score: true },
  });

  await prisma.user.update({
    where: { id: parsed.data.rateeId },
    data: { trustScore: agg._avg.score ?? 3.5 },
  });

  return apiSuccess(rating, 201);
}

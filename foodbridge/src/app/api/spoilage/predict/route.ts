import { apiError, apiSuccess } from "@/lib/api";
import { predictSpoilageRisk } from "@/lib/spoilage";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { donationSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 120, 60_000);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "NGO", "VOLUNTEER", "ADMIN"]);
  if (access.error) return access.error;

  const body = await request.json();
  const parsed = donationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid spoilage prediction payload", 422, parsed.error.flatten());
  }

  const prediction = predictSpoilageRisk({
    expiryAt: new Date(parsed.data.expiryAt),
    temperatureC: parsed.data.temperatureC,
    handlingScore: parsed.data.handlingScore,
    foodType: parsed.data.foodType,
  });

  return apiSuccess({ prediction });
}

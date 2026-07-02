import bcrypt from "bcryptjs";
import { apiError, apiSuccess } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 20, 60_000);
  if (!rl.ok) {
    return apiError("Rate limit exceeded", 429, { retryAfterMs: rl.retryAfterMs });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid input", 422, parsed.error.flatten());
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    return apiError("Email already registered", 409);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      organization: parsed.data.organization,
      phone: parsed.data.phone,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return apiSuccess(user, 201);
}

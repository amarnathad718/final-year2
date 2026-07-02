import { v2 as cloudinary } from "cloudinary";
import { apiError, apiSuccess } from "@/lib/api";
import { requireRole } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, 30, 60_000);
  if (!rl.ok) return apiError("Rate limit exceeded", 429);

  const access = await requireRole(["DONOR", "ADMIN"]);
  if (access.error) return access.error;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "foodbridge/donations";

  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
      context: `uploader=${access.session.user.id}`,
    },
    process.env.CLOUDINARY_API_SECRET || "",
  );

  return apiSuccess({
    timestamp,
    folder,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}

import { apiSuccess } from "@/lib/api";

export async function GET() {
  return apiSuccess({
    service: "foodbridge",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

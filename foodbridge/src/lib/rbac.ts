import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";

export type AppRole = "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";

export async function requireRole(roles: AppRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return { error: apiError("Unauthorized", 401) };
  }

  if (!roles.includes(session.user.role)) {
    return { error: apiError("Forbidden", 403) };
  }

  return { session };
}

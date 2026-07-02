import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleRouteMap: Record<string, string[]> = {
  "/dashboard/admin": ["ADMIN"],
  "/dashboard/donor": ["DONOR", "ADMIN"],
  "/dashboard/ngo": ["NGO", "ADMIN"],
  "/dashboard/volunteer": ["VOLUNTEER", "ADMIN"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/dashboard") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/register") || pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET || "foodbridge-dev-secret" });
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const role = String(token.role ?? "");

  for (const [routePrefix, roles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(routePrefix) && !roles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};

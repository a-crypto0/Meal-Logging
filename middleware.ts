import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/welcome", "/auth"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes and static files pass through
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const authed = request.cookies.get("meal-app-authed")?.value === "1";

  // Redirect authenticated users away from auth page
  if (authed && pathname === "/auth") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow public paths through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!authed) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};

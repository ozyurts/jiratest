/**
 * Next.js Edge Middleware — Route Protection (NFR §4.1, §4.2)
 * Runs on every request before it reaches route handlers.
 * Verifies the JWT access token from HttpOnly cookie.
 * Unauthenticated requests to protected routes → redirect to /login.
 * Authenticated requests to /login or /register → redirect to /entry.
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register", "/api/v1/auth/login", "/api/v1/auth/register", "/api/health", "/api/v1/teams"];
const ADMIN_PATHS = ["/admin", "/api/v1/users", "/api/v1/efforts/dashboard", "/api/v1/efforts/trends"];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = request.cookies.get("wt_access")?.value;

  let payload: { sub?: string; role?: string; email?: string } | null = null;

  if (token) {
    try {
      const { payload: p } = await jwtVerify(token, getJwtSecret());
      payload = p as { sub?: string; role?: string; email?: string };
    } catch {
      // Token invalid or expired
    }
  }

  // Redirect authenticated users away from login/register
  if (payload && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/entry", request.url));
  }

  // Redirect root to appropriate page
  if (pathname === "/") {
    if (payload) {
      return NextResponse.redirect(new URL("/entry", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect all non-public paths
  if (!isPublic && !payload) {
    // API routes return 401 instead of redirecting
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { message: "Kimlik doğrulama gerekli.", timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only path enforcement (NFR §4.2)
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath && payload?.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { message: "Bu işlem için yetkiniz bulunmuyor.", timestamp: new Date().toISOString() },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/entry", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

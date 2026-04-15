/**
 * JWT Auth Utilities (NFR §4.1)
 * - Access token: <= 1 hour
 * - Refresh token: <= 24 hours
 * - Stored in HttpOnly cookies (BFF pattern — NFR §4.2)
 * - Uses `jose` library (Edge Runtime compatible for Next.js middleware)
 */
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ACCESS_TOKEN_COOKIE = "wt_access";
export const REFRESH_TOKEN_COOKIE = "wt_refresh";

const ACCESS_EXPIRES_SECONDS = parseInt(
  process.env.JWT_ACCESS_EXPIRES_IN ?? "3600",
  10
);
const REFRESH_EXPIRES_SECONDS = parseInt(
  process.env.JWT_REFRESH_EXPIRES_IN ?? "86400",
  10
);

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
}

// ── Token Payloads ───────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;     // userId
  email: string;
  role: "USER" | "ADMIN";
  fullName: string;
}

export interface RefreshTokenPayload {
  sub: string;     // userId
  jti: string;     // unique token ID (stored in DB for revocation)
}

// ── Sign ─────────────────────────────────────────────────────────────────────

export async function signAccessToken(
  payload: AccessTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_EXPIRES_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function signRefreshToken(
  payload: RefreshTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_EXPIRES_SECONDS}s`)
    .sign(getJwtSecret());
}

// ── Verify ───────────────────────────────────────────────────────────────────

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers (server-side only) ────────────────────────────────────────

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: ACCESS_EXPIRES_SECONDS,
    path: "/",
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: REFRESH_EXPIRES_SECONDS,
    path: "/api/v1/auth/refresh",
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

// ── Current User (server components / route handlers) ────────────────────────

export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const token = await getAccessTokenFromCookies();
  if (!token) return null;
  return verifyAccessToken(token);
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000);
}

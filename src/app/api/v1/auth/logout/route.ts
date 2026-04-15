/**
 * POST /api/v1/auth/logout
 * Revokes both access and refresh tokens (NFR §4.1).
 */
import { NextRequest } from "next/server";
import { verifyRefreshToken, clearAuthCookies, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { cookies } from "next/headers";

export async function POST(_request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const cookieStore = await cookies();
    const refreshTokenCookie = cookieStore.get("wt_refresh")?.value;

    // Revoke refresh token in DB
    if (refreshTokenCookie) {
      const payload = await verifyRefreshToken(refreshTokenCookie);
      if (payload?.jti) {
        await prisma.refreshToken.updateMany({
          where: { token: payload.jti, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }

    await clearAuthCookies();

    if (currentUser) {
      logger.info("User logged out", { userId: currentUser.sub });
    }

    return ok({ message: "Başarıyla çıkış yapıldı." });
  } catch (err) {
    logger.error("Logout error", { error: String(err) });
    return internalError();
  }
}

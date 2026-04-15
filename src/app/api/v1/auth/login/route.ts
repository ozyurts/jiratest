/**
 * POST /api/v1/auth/login
 */
import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, setAuthCookies, refreshTokenExpiresAt } from "@/lib/auth";
import { ok, badRequest, unauthorized, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { MeDto } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path.join(".") || "general";
        details[key] = [...(details[key] ?? []), e.message];
      });
      return badRequest("Girilen bilgiler geçersiz.", details);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isDeleted: "NO" },
      include: { team: true },
    });

    // Constant-time comparison to prevent user enumeration
    if (!user) {
      await verifyPassword(password, "$2b$12$placeholder.hash.to.prevent.timing.attacks.aaaaaaaaaaaa");
      return unauthorized("E-posta veya şifre hatalı.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      logger.warn("Failed login attempt", { email: user.email });
      return unauthorized("E-posta veya şifre hatalı.");
    }

    // Sign tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as "USER" | "ADMIN",
      fullName: user.fullName,
    });

    const jti = crypto.randomUUID();
    const refreshToken = await signRefreshToken({ sub: user.id, jti });

    await prisma.refreshToken.create({
      data: {
        token: jti,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    await setAuthCookies(accessToken, refreshToken);

    const dto: MeDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as "USER" | "ADMIN",
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
    };

    logger.info("User logged in", { userId: user.id });

    return ok(dto);
  } catch (err) {
    logger.error("Login failed", { error: String(err) });
    return internalError();
  }
}

/**
 * POST /api/v1/auth/register
 * Self-registration. Any visitor can create a USER account.
 */
import { NextRequest } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, setAuthCookies, refreshTokenExpiresAt } from "@/lib/auth";
import { createAudit } from "@/lib/audit";
import { created, conflict, badRequest, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { MeDto } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path.join(".") || "general";
        details[key] = [...(details[key] ?? []), e.message];
      });
      return badRequest("Girilen bilgiler geçersiz.", details);
    }

    const { email, password, fullName, teamId } = parsed.data;

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), isDeleted: "NO" },
    });
    if (existing) {
      return conflict("Bu e-posta adresi zaten kayıtlı.");
    }

    // Verify team exists (if provided)
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: { id: teamId, isDeleted: "NO" },
      });
      if (!team) {
        return badRequest("Seçilen takım mevcut değil.", { teamId: ["Geçersiz takım."] });
      }
    }

    const passwordHash = await hashPassword(password);
    const audit = createAudit(email.toLowerCase());

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        role: "USER",
        teamId: teamId ?? null,
        ...audit,
      },
      include: { team: true },
    });

    // Sign tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as "USER" | "ADMIN",
      fullName: user.fullName,
    });

    const jti = crypto.randomUUID();
    const refreshToken = await signRefreshToken({ sub: user.id, jti });

    // Store refresh token for revocation support (NFR §4.1)
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

    logger.info("User registered", { userId: user.id, email: user.email });

    return created(dto);
  } catch (err) {
    logger.error("Register failed", { error: String(err) });
    return internalError();
  }
}

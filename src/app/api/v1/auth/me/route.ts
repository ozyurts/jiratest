/**
 * GET   /api/v1/auth/me  — Returns the authenticated user's profile.
 * PATCH /api/v1/auth/me  — Self-service profile update (team change).
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateAudit } from "@/lib/audit";
import { ok, unauthorized, notFound, badRequest, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getWeekStart } from "@/lib/week";
import type { MeDto } from "@/types";

const updateProfileSchema = z.object({
  teamId: z.string().nullable().optional(),
});

function toMeDto(user: {
  id: string; email: string; fullName: string; role: string;
  teamId: string | null; team: { name: string } | null;
}): MeDto {
  return {
    id: user.id, email: user.email, fullName: user.fullName,
    role: user.role as "USER" | "ADMIN",
    teamId: user.teamId, teamName: user.team?.name ?? null,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const tokenUser = await getCurrentUser();
    if (!tokenUser) return unauthorized();

    const user = await prisma.user.findFirst({
      where: { id: tokenUser.sub, isDeleted: "NO" },
      include: { team: true },
    });

    if (!user) return notFound("Kullanıcı bulunamadı.");
    return ok(toMeDto(user));
  } catch {
    return internalError();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tokenUser = await getCurrentUser();
    if (!tokenUser) return unauthorized();

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Geçersiz istek.");
    }

    const { teamId } = parsed.data;

    // Verify team exists if provided
    if (teamId) {
      const team = await prisma.team.findFirst({ where: { id: teamId, isDeleted: "NO" } });
      if (!team) return badRequest("Seçilen takım mevcut değil.", { teamId: ["Geçersiz takım."] });
    }

    // Update user's team
    const updatedUser = await prisma.user.update({
      where: { id: tokenUser.sub },
      data: { teamId: teamId ?? null, ...updateAudit(tokenUser.email) },
      include: { team: true },
    });

    // Also update the current week's effort entry (if it exists) to reflect the new team
    const weekStart = getWeekStart();
    await prisma.effortEntry.updateMany({
      where: {
        userId: tokenUser.sub,
        weekStartDate: weekStart,
        isDeleted: "NO",
      },
      data: { teamId: teamId ?? null, ...updateAudit(tokenUser.email) },
    });

    logger.info("User changed team", { userId: tokenUser.sub, newTeamId: teamId });
    return ok(toMeDto(updatedUser));
  } catch {
    return internalError();
  }
}

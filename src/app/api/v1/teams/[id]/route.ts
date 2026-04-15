/**
 * PUT    /api/v1/teams/:id  — Update team name (Admin only)
 * DELETE /api/v1/teams/:id  — Soft-delete a team (Admin only, NFR §5.1)
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { teamSchema } from "@/lib/validations/team";
import { updateAudit, deleteAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, notFound, conflict, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { TeamDto } from "@/types";

function toDto(team: {
  id: string; name: string; createdBy: string; lastUpdater: string;
  operationTime: Date; isDeleted: string;
}): TeamDto {
  return {
    id: team.id, name: team.name, createdBy: team.createdBy,
    lastUpdater: team.lastUpdater, operationTime: team.operationTime.toISOString(),
    isDeleted: team.isDeleted as "YES" | "NO",
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ADMIN") return forbidden();

    const { id } = await params;

    const existing = await prisma.team.findFirst({ where: { id, isDeleted: "NO" } });
    if (!existing) return notFound("Takım bulunamadı.");

    const body = await request.json();
    const parsed = teamSchema.safeParse(body);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path.join(".") || "general";
        details[key] = [...(details[key] ?? []), e.message];
      });
      return badRequest("Girilen bilgiler geçersiz.", details);
    }

    // Check name uniqueness (exclude current)
    const duplicate = await prisma.team.findFirst({
      where: { name: parsed.data.name, isDeleted: "NO", NOT: { id } },
    });
    if (duplicate) return conflict("Bu isimde bir takım zaten mevcut.");

    const updated = await prisma.team.update({
      where: { id },
      data: { name: parsed.data.name, ...updateAudit(user.email) },
    });

    logger.info("Team updated", { teamId: id, by: user.email });
    return ok(toDto(updated));
  } catch {
    return internalError();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ADMIN") return forbidden();

    const { id } = await params;

    const existing = await prisma.team.findFirst({ where: { id, isDeleted: "NO" } });
    if (!existing) return notFound("Takım bulunamadı.");

    // Soft delete — NFR §5.1 (NEVER physical DELETE)
    const deleted = await prisma.team.update({
      where: { id },
      data: deleteAudit(user.email),
    });

    logger.info("Team soft-deleted", { teamId: id, by: user.email });
    return ok(toDto(deleted));
  } catch {
    return internalError();
  }
}

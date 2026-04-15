/**
 * PUT    /api/v1/users/:id  — Update user (role, team, name) — Admin only
 * DELETE /api/v1/users/:id  — Soft-delete user — Admin only
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserSchema } from "@/lib/validations/user";
import { updateAudit, deleteAudit } from "@/lib/audit";
import { ok, badRequest, unauthorized, forbidden, notFound, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { UserDto } from "@/types";

function toDto(u: {
  id: string; email: string; fullName: string; role: string;
  teamId: string | null; createdBy: string; lastUpdater: string;
  operationTime: Date; isDeleted: string;
  team: { name: string } | null;
}): UserDto {
  return {
    id: u.id, email: u.email, fullName: u.fullName,
    role: u.role as "USER" | "ADMIN", teamId: u.teamId,
    teamName: u.team?.name ?? null, createdBy: u.createdBy,
    lastUpdater: u.lastUpdater, operationTime: u.operationTime.toISOString(),
    isDeleted: u.isDeleted as "YES" | "NO",
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { id } = await params;
    const target = await prisma.user.findFirst({
      where: { id, isDeleted: "NO" },
      include: { team: true },
    });
    if (!target) return notFound("Kullanıcı bulunamadı.");

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path.join(".") || "general";
        details[key] = [...(details[key] ?? []), e.message];
      });
      return badRequest("Girilen bilgiler geçersiz.", details);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { ...parsed.data, ...updateAudit(currentUser.email) },
      include: { team: true },
    });

    logger.info("User updated", { targetId: id, by: currentUser.email });
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
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { id } = await params;

    // Prevent self-deletion
    if (id === currentUser.sub) {
      return badRequest("Kendi hesabınızı silemezsiniz.");
    }

    const target = await prisma.user.findFirst({
      where: { id, isDeleted: "NO" },
      include: { team: true },
    });
    if (!target) return notFound("Kullanıcı bulunamadı.");

    // Soft delete — NFR §5.1
    const deleted = await prisma.user.update({
      where: { id },
      data: deleteAudit(currentUser.email),
      include: { team: true },
    });

    logger.info("User soft-deleted", { targetId: id, by: currentUser.email });
    return ok(toDto(deleted));
  } catch {
    return internalError();
  }
}

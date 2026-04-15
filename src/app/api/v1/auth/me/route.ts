/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile.
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, unauthorized, notFound, internalError } from "@/lib/api-response";
import type { MeDto } from "@/types";

export async function GET(_request: NextRequest) {
  try {
    const tokenUser = await getCurrentUser();
    if (!tokenUser) return unauthorized();

    const user = await prisma.user.findFirst({
      where: { id: tokenUser.sub, isDeleted: "NO" },
      include: { team: true },
    });

    if (!user) return notFound("Kullanıcı bulunamadı.");

    const dto: MeDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as "USER" | "ADMIN",
      teamId: user.teamId,
      teamName: user.team?.name ?? null,
    };

    return ok(dto);
  } catch (err) {
    return internalError();
  }
}

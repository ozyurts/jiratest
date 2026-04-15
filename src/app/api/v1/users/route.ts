/**
 * GET /api/v1/users — List all users, paginated (Admin only)
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paginated, unauthorized, forbidden, internalError } from "@/lib/api-response";
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

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
    const teamId = searchParams.get("teamId") ?? undefined;

    const where = {
      isDeleted: "NO",
      ...(teamId ? { teamId } : {}),
    };

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: { team: true },
        orderBy: { fullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return paginated(users.map(toDto), page, pageSize, total);
  } catch {
    return internalError();
  }
}

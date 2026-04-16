/**
 * GET /api/v1/efforts/my
 * Returns the authenticated user's own effort history (paginated).
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paginated, unauthorized, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { EffortEntryDto } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(52, Math.max(1, parseInt(searchParams.get("pageSize") ?? "12", 10)));

    const where = { userId: currentUser.sub, isDeleted: "NO" };

    const [entries, total] = await prisma.$transaction([
      prisma.effortEntry.findMany({
        where,
        include: { user: { include: { team: true } } },
        orderBy: { weekStartDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.effortEntry.count({ where }),
    ]);

    const dtos: EffortEntryDto[] = entries.map((e) => ({
      id: e.id,
      userId: e.userId,
      userFullName: e.user.fullName,
      teamId: e.user.teamId,
      teamName: e.user.team?.name ?? null,
      weekStartDate: e.weekStartDate.toISOString().slice(0, 10),
      pastPercentage: e.pastPercentage,
      todayPercentage: e.todayPercentage,
      futurePercentage: e.futurePercentage,
      notes: e.notes,
      createdBy: e.createdBy,
      lastUpdater: e.lastUpdater,
      operationTime: e.operationTime.toISOString(),
      isDeleted: e.isDeleted as "YES" | "NO",
    }));

    logger.info("My history fetched", { userId: currentUser.sub, count: entries.length });
    return paginated(dtos, page, pageSize, total);
  } catch (err) {
    logger.error("GET /efforts/my failed", { error: String(err) });
    return internalError();
  }
}

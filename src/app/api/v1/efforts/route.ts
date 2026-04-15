/**
 * GET  /api/v1/efforts  — Admin: list all efforts (paginated + filtered)
 * POST /api/v1/efforts  — Any authenticated user: create/upsert own weekly effort
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { effortEntrySchema, effortQuerySchema } from "@/lib/validations/effort";
import { createAudit, updateAudit } from "@/lib/audit";
import { getWeekStart } from "@/lib/week";
import { ok, created, badRequest, unauthorized, forbidden, internalError, paginated } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { EffortEntryDto } from "@/types";

function toDto(e: {
  id: string; userId: string; weekStartDate: Date;
  pastPercentage: number; todayPercentage: number; futurePercentage: number;
  notes: string | null; createdBy: string; lastUpdater: string;
  operationTime: Date; isDeleted: string;
  // teamId snapshot on entry; fall back to user's current team for old entries
  teamId: string | null;
  team: { name: string } | null;
  user: { fullName: string; teamId: string | null; team: { name: string } | null };
}): EffortEntryDto {
  return {
    id: e.id, userId: e.userId,
    userFullName: e.user.fullName,
    teamId: e.teamId ?? e.user.teamId,
    teamName: e.team?.name ?? e.user.team?.name ?? null,
    weekStartDate: e.weekStartDate.toISOString().slice(0, 10),
    pastPercentage: e.pastPercentage, todayPercentage: e.todayPercentage,
    futurePercentage: e.futurePercentage, notes: e.notes,
    createdBy: e.createdBy, lastUpdater: e.lastUpdater,
    operationTime: e.operationTime.toISOString(),
    isDeleted: e.isDeleted as "YES" | "NO",
  };
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { searchParams } = request.nextUrl;
    const queryParsed = effortQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryParsed.success) return badRequest("Geçersiz sorgu parametreleri.");

    const { page, pageSize, userId, teamId, weekFrom, weekTo } = queryParsed.data;

    // Filter by teamId snapshot on entry; also catch old entries (null teamId) via user.teamId
    const teamFilter = teamId
      ? { OR: [{ teamId }, { AND: [{ teamId: null }, { user: { teamId } }] }] }
      : {};

    const where = {
      isDeleted: "NO",
      ...(userId ? { userId } : {}),
      ...teamFilter,
      ...(weekFrom || weekTo ? {
        weekStartDate: {
          ...(weekFrom ? { gte: new Date(weekFrom) } : {}),
          ...(weekTo ? { lte: new Date(weekTo) } : {}),
        },
      } : {}),
    };

    const [entries, total] = await prisma.$transaction([
      prisma.effortEntry.findMany({
        where,
        include: { team: true, user: { include: { team: true } } },
        orderBy: [{ weekStartDate: "desc" }, { user: { fullName: "asc" } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.effortEntry.count({ where }),
    ]);

    return paginated(entries.map(toDto), page, pageSize, total);
  } catch {
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();

    const body = await request.json();
    const parsed = effortEntrySchema.safeParse(body);
    if (!parsed.success) {
      const details: Record<string, string[]> = {};
      parsed.error.errors.forEach((e) => {
        const key = e.path.join(".") || "general";
        details[key] = [...(details[key] ?? []), e.message];
      });
      return badRequest("Girilen bilgiler geçersiz.", details);
    }

    const { weekStartDate, pastPercentage, todayPercentage, futurePercentage, notes } = parsed.data;

    const parsedDate = new Date(weekStartDate + "T00:00:00.000Z");
    const monday = getWeekStart(parsedDate);

    // Fetch user's current teamId to snapshot on the entry
    const dbUser = await prisma.user.findFirst({
      where: { id: currentUser.sub, isDeleted: "NO" },
      select: { teamId: true },
    });
    const snapshotTeamId = dbUser?.teamId ?? null;

    const existing = await prisma.effortEntry.findFirst({
      where: { userId: currentUser.sub, weekStartDate: monday, isDeleted: "NO" },
    });

    if (existing) {
      const updated = await prisma.effortEntry.update({
        where: { id: existing.id },
        data: {
          pastPercentage, todayPercentage, futurePercentage,
          notes: notes ?? null,
          teamId: snapshotTeamId,
          ...updateAudit(currentUser.email),
        },
        include: { team: true, user: { include: { team: true } } },
      });
      logger.info("Effort updated", { entryId: updated.id, userId: currentUser.sub });
      return ok(toDto(updated));
    }

    const audit = createAudit(currentUser.email);
    const entry = await prisma.effortEntry.create({
      data: {
        userId: currentUser.sub,
        teamId: snapshotTeamId,
        weekStartDate: monday,
        pastPercentage, todayPercentage, futurePercentage,
        notes: notes ?? null,
        ...audit,
      },
      include: { team: true, user: { include: { team: true } } },
    });

    logger.info("Effort created", { entryId: entry.id, userId: currentUser.sub });
    return created(toDto(entry));
  } catch {
    return internalError();
  }
}

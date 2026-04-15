/**
 * GET /api/v1/efforts/trends
 * Admin only — weekly trend for a specific user or team over last N weeks.
 * Query params: userId?, teamId?, weeks? (default 12)
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, ok, internalError } from "@/lib/api-response";
import { getLastNWeekStarts } from "@/lib/week";
import type { WeeklyAverageDto } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId") ?? undefined;
    const teamId = searchParams.get("teamId") ?? undefined;
    const weeksBack = Math.min(52, Math.max(1, parseInt(searchParams.get("weeks") ?? "12", 10)));

    const weekStarts = getLastNWeekStarts(weeksBack);
    const fromDate = weekStarts[0];

    const where: Record<string, unknown> = {
      isDeleted: "NO",
      weekStartDate: { gte: fromDate },
    };

    if (userId) {
      where.userId = userId;
    } else if (teamId) {
      where.user = { teamId, isDeleted: "NO" };
    } else {
      where.user = { isDeleted: "NO" };
    }

    const entries = await prisma.effortEntry.findMany({
      where,
      orderBy: { weekStartDate: "asc" },
    });

    const weekMap = new Map<string, { past: number[]; today: number[]; future: number[] }>();

    for (const e of entries) {
      const key = e.weekStartDate.toISOString().slice(0, 10);
      if (!weekMap.has(key)) weekMap.set(key, { past: [], today: [], future: [] });
      const b = weekMap.get(key)!;
      b.past.push(e.pastPercentage);
      b.today.push(e.todayPercentage);
      b.future.push(e.futurePercentage);
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

    const trends: WeeklyAverageDto[] = weekStarts.map((d) => {
      const key = d.toISOString().slice(0, 10);
      const b = weekMap.get(key);
      return {
        weekStartDate: key,
        pastAvg: b ? avg(b.past) : 0,
        todayAvg: b ? avg(b.today) : 0,
        futureAvg: b ? avg(b.future) : 0,
        entryCount: b?.past.length ?? 0,
      };
    });

    return ok(trends);
  } catch {
    return internalError();
  }
}

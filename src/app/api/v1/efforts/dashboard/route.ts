/**
 * GET /api/v1/efforts/dashboard
 * Admin only — aggregated dashboard data.
 * Uses teamId snapshot on entries; falls back to user.teamId for old entries.
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unauthorized, forbidden, ok, internalError } from "@/lib/api-response";
import { getLastNWeekStarts } from "@/lib/week";
import type { DashboardDto, MemberSummaryDto, WeeklyAverageDto } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return unauthorized();
    if (currentUser.role !== "ADMIN") return forbidden();

    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("teamId") ?? undefined;
    const weeksBack = Math.min(52, Math.max(1, parseInt(searchParams.get("weeks") ?? "12", 10)));

    const weekStarts = getLastNWeekStarts(weeksBack);
    const fromDate = weekStarts[0];

    // Filter by teamId snapshot; catch old entries (null teamId) via user.teamId
    const teamFilter = teamId
      ? { OR: [{ teamId }, { AND: [{ teamId: null }, { user: { teamId } }] }] }
      : {};

    const entries = await prisma.effortEntry.findMany({
      where: {
        isDeleted: "NO",
        weekStartDate: { gte: fromDate },
        user: { isDeleted: "NO" },
        ...teamFilter,
      },
      include: { team: true, user: { include: { team: true } } },
      orderBy: { weekStartDate: "asc" },
    });

    // ── Weekly averages ────────────────────────────────────────────────────────
    const weekMap = new Map<string, { past: number[]; today: number[]; future: number[] }>();

    for (const e of entries) {
      const key = e.weekStartDate.toISOString().slice(0, 10);
      if (!weekMap.has(key)) weekMap.set(key, { past: [], today: [], future: [] });
      const bucket = weekMap.get(key)!;
      bucket.past.push(e.pastPercentage);
      bucket.today.push(e.todayPercentage);
      bucket.future.push(e.futurePercentage);
    }

    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

    const teamAverages: WeeklyAverageDto[] = weekStarts.map((d) => {
      const key = d.toISOString().slice(0, 10);
      const bucket = weekMap.get(key);
      return {
        weekStartDate: key,
        pastAvg: bucket ? avg(bucket.past) : 0,
        todayAvg: bucket ? avg(bucket.today) : 0,
        futureAvg: bucket ? avg(bucket.future) : 0,
        entryCount: bucket?.past.length ?? 0,
      };
    });

    // ── Latest entry per member ───────────────────────────────────────────────
    const allUsers = await prisma.user.findMany({
      where: { isDeleted: "NO", ...(teamId ? { teamId } : {}) },
      include: { team: true },
      orderBy: { fullName: "asc" },
    });

    const latestEntryMap = new Map<string, (typeof entries)[number]>();
    for (const e of entries) {
      const existing = latestEntryMap.get(e.userId);
      if (!existing || e.weekStartDate > existing.weekStartDate) {
        latestEntryMap.set(e.userId, e);
      }
    }

    const memberSummaries: MemberSummaryDto[] = allUsers.map((u) => {
      const latest = latestEntryMap.get(u.id);
      const entryTeamId = latest ? (latest.teamId ?? latest.user.teamId) : u.teamId;
      const entryTeamName = latest
        ? (latest.team?.name ?? latest.user.team?.name ?? null)
        : u.team?.name ?? null;
      return {
        userId: u.id, fullName: u.fullName,
        teamId: entryTeamId, teamName: entryTeamName,
        latestWeek: latest?.weekStartDate.toISOString().slice(0, 10) ?? null,
        pastPercentage: latest?.pastPercentage ?? null,
        todayPercentage: latest?.todayPercentage ?? null,
        futurePercentage: latest?.futurePercentage ?? null,
      };
    });

    return ok({ teamAverages, memberSummaries } as DashboardDto);
  } catch {
    return internalError();
  }
}

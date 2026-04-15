/**
 * GET  /api/v1/teams  — List all active teams (any authenticated user)
 * POST /api/v1/teams  — Create a team (Admin only)
 */
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { teamSchema } from "@/lib/validations/team";
import { createAudit } from "@/lib/audit";
import { ok, created, badRequest, unauthorized, forbidden, conflict, internalError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import type { TeamDto } from "@/types";

function toDto(team: {
  id: string;
  name: string;
  createdBy: string;
  lastUpdater: string;
  operationTime: Date;
  isDeleted: string;
}): TeamDto {
  return {
    id: team.id,
    name: team.name,
    createdBy: team.createdBy,
    lastUpdater: team.lastUpdater,
    operationTime: team.operationTime.toISOString(),
    isDeleted: team.isDeleted as "YES" | "NO",
  };
}

// GET is intentionally public — team names are needed for self-registration
export async function GET(_request: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      where: { isDeleted: "NO" },
      orderBy: { name: "asc" },
    });

    return ok(teams.map(toDto));
  } catch {
    return internalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    if (user.role !== "ADMIN") return forbidden();

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

    const existing = await prisma.team.findFirst({
      where: { name: parsed.data.name, isDeleted: "NO" },
    });
    if (existing) return conflict("Bu isimde bir takım zaten mevcut.");

    const audit = createAudit(user.email);
    const team = await prisma.team.create({
      data: { name: parsed.data.name, ...audit },
    });

    logger.info("Team created", { teamId: team.id, name: team.name, by: user.email });
    return created(toDto(team));
  } catch {
    return internalError();
  }
}

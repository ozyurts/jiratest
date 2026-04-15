/**
 * Seed Script — Dev & Test profiles only (NFR §5.5)
 * Idempotent: safe to re-run; uses upsert to avoid duplicates.
 * DO NOT run in production (guarded by NODE_ENV check).
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "Seed must not run in production. Aborting."
    );
    process.exit(1);
  }

  console.log("Seeding dev database...");

  // ── Teams ──────────────────────────────────────────────────────────────────
  const teams = [
    "Backend Ekibi",
    "Frontend Ekibi",
    "Platform & DevOps",
    "Ürün & Tasarım",
  ];

  const createdTeams: Record<string, string> = {};

  for (const teamName of teams) {
    const team = await prisma.team.upsert({
      where: { name: teamName },
      update: { lastUpdater: "seed", lastOperation: "UPDATE" },
      create: {
        name: teamName,
        createdBy: "seed",
        lastUpdater: "seed",
        lastOperation: "CREATE",
        isDeleted: "NO",
      },
    });
    createdTeams[teamName] = team.id;
    console.log(`  Team: ${team.name} (${team.id})`);
  }

  // ── Admin User (dev-only — NFR §4.5) ──────────────────────────────────────
  // DEV ONLY: This user is for local development. Not deployable to production.
  const adminPassword = await bcrypt.hash("Admin123!", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@workload.dev" },
    update: { lastUpdater: "seed", lastOperation: "UPDATE" },
    create: {
      email: "admin@workload.dev",
      passwordHash: adminPassword,
      fullName: "Admin Kullanıcı",
      role: "ADMIN",
      teamId: createdTeams["Backend Ekibi"],
      createdBy: "seed",
      lastUpdater: "seed",
      lastOperation: "CREATE",
      isDeleted: "NO",
    },
  });
  console.log(`  Admin: ${adminUser.email} (DEV ONLY — not for production)`);

  // ── Sample Team Members ────────────────────────────────────────────────────
  const sampleUsers = [
    { email: "ali.veli@workload.dev", fullName: "Ali Veli", team: "Backend Ekibi" },
    { email: "ayse.kaya@workload.dev", fullName: "Ayşe Kaya", team: "Frontend Ekibi" },
    { email: "mehmet.oz@workload.dev", fullName: "Mehmet Öz", team: "Platform & DevOps" },
  ];

  const samplePassword = await bcrypt.hash("User123!", 12);

  for (const u of sampleUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { lastUpdater: "seed", lastOperation: "UPDATE" },
      create: {
        email: u.email,
        passwordHash: samplePassword,
        fullName: u.fullName,
        role: "USER",
        teamId: createdTeams[u.team],
        createdBy: "seed",
        lastUpdater: "seed",
        lastOperation: "CREATE",
        isDeleted: "NO",
      },
    });
    console.log(`  User: ${user.email}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

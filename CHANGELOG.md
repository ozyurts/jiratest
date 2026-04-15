# Changelog — Workload Tracker

All notable changes to this project will be documented in this file.

## [0.1.0] — 2026-04-15

### Added
- Initial project setup with Next.js 15, TypeScript, Prisma, Tailwind CSS
- Self-registration and JWT-based authentication (HttpOnly cookie)
- Two roles: USER and ADMIN
- Weekly effort entry with 3-way slider (Geçmiş / Bugün / Yarın)
- Personal effort history with pagination
- Admin dashboard with team-wide trend charts
- Per-member and per-team weekly trend filtering
- Admin team management (add, edit, soft-delete)
- Admin user management (role assignment, team assignment, soft-delete)
- Triple-layer validation (frontend Zod + API Zod + DB constraints)
- Soft delete on all entities (NFR §5.1)
- Audit columns on all tables (NFR §5.2)
- JWT refresh token revocation on logout (NFR §4.1)
- `/api/health` liveness endpoint
- Docker + docker-compose for local dev
- Full documentation suite (README, ARCHITECTURE, API-DOCS, DEVELOPMENT-GUIDE, CONFIGURATION-GUIDE)

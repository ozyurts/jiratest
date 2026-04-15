# Copilot / AI Agent Instructions — Workload Tracker

## Project Purpose
Workload Tracker is an internal team tool for tracking weekly workforce effort distribution across three categories: Past Work (Geçmişin İşleri), Current Work (Bugünün İşleri), and Future Work (Yarının İşleri). Team members enter their weekly percentages; admins see aggregated dashboards and trends.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **ORM**: Prisma 5
- **DB**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT in HttpOnly cookies (`wt_access`, `wt_refresh`)
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Deploy**: Vercel

## Repository Structure
```
src/
  app/
    (app)/          — protected routes (layout checks auth)
      entry/        — effort entry page
      history/      — personal history
      dashboard/    — admin dashboard
      admin/
        teams/      — admin team management
        users/      — admin user management
    api/v1/         — API route handlers
      auth/         — register, login, logout, me
      teams/        — CRUD
      users/        — CRUD
      efforts/      — CRUD + dashboard + trends
    login/          — public login page
    register/       — public register page
  components/
    ui/             — Button, Input, Card, Badge
    shared/         — Navbar, ErrorAlert, LoadingSpinner
    effort/         — EffortSlider, EffortHistoryTable
    dashboard/      — TrendChart, MemberSummaryTable
    admin/          — TeamTable, UserTable
  lib/
    db.ts           — Prisma client singleton
    auth.ts         — JWT sign/verify/cookie helpers
    password.ts     — bcrypt helpers
    logger.ts       — structured logging
    audit.ts        — audit field helpers
    week.ts         — UTC week boundary utilities
    api-client.ts   — centralised frontend HTTP client
    api-response.ts — standardised response helpers
    validations/    — Zod schemas (auth, effort, team, user)
  middleware.ts     — Edge middleware (JWT check on all requests)
  types/index.ts    — shared DTOs and TypeScript types
prisma/
  schema.prisma
  seed.ts
```

## Architectural Rules (DO NOT CHANGE WITHOUT APPROVAL)
- ORM models are NEVER returned directly from API routes — always map to a DTO
- Physical DELETE is NEVER used — all deletions set `isDeleted: "YES"`
- JWT is stored in HttpOnly cookies ONLY — never `localStorage` or `sessionStorage`
- All API HTTP calls from the frontend go through `src/lib/api-client.ts` exclusively
- All audit columns (`createdBy`, `lastUpdater`, `operationTime`, `lastOperation`, `isDeleted`) must be populated on every write
- Week boundaries are always Monday 00:00:00 UTC — use `getWeekStart()` from `src/lib/week.ts`
- Effort percentages must always sum to 100 — validated at frontend, API, and DB levels

## Coding Standards
- No `console.log` / `print` — use `src/lib/logger.ts`
- No magic strings — use constants or enums
- No business logic in UI components — data transforms in API or hooks
- Validation errors → HTTP 400 with field-level details
- Auth errors → HTTP 401; Authorization errors → HTTP 403
- All list endpoints are paginated — never return unbounded results

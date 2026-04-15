# Architecture — Workload Tracker

## System Overview

```
Browser
  │
  ├── Next.js Frontend (React, Tailwind CSS)
  │     ├── /login, /register         — public pages
  │     ├── /entry, /history          — user pages
  │     └── /dashboard, /admin/*      — admin pages
  │
  ├── Next.js API Routes (serverless functions on Vercel)
  │     └── /api/v1/
  │           ├── auth/    (register, login, logout, me)
  │           ├── teams/
  │           ├── users/
  │           ├── efforts/ (my, dashboard, trends)
  │           └── health
  │
  └── Edge Middleware (src/middleware.ts)
        └── JWT verification on every request (except public paths)
```

## Layered Architecture (NFR §3.1)

```
┌────────────────────────────────────────────────────────┐
│  Route Handler Layer  (src/app/api/v1/**/route.ts)      │
│  HTTP routing, request parsing, response formatting.    │
│  No business logic.                                     │
├────────────────────────────────────────────────────────┤
│  Service / Business Logic                               │
│  Embedded within route handlers (appropriate for        │
│  serverless; no stateful service classes needed).       │
│  All transactions here.                                 │
├────────────────────────────────────────────────────────┤
│  Repository / Data Layer  (Prisma queries)              │
│  Data access via Prisma ORM. No business logic.         │
├────────────────────────────────────────────────────────┤
│  Database Layer  (SQLite dev / PostgreSQL prod)          │
│  Audit columns on every table. Soft delete only.        │
└────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Authentication — JWT + HttpOnly Cookie
- Access token expires in 1 hour (NFR §4.1)
- Refresh token expires in 24 hours, stored in DB for revocation
- Tokens stored in HttpOnly cookies (BFF pattern — prevents XSS)
- Edge Middleware validates JWT on every request before routing

### Soft Delete (NFR §5.1)
- Records are NEVER physically deleted
- Every entity has `IS_DELETED` column (`YES` / `NO`)
- Queries always filter `isDeleted: "NO"`

### Audit Columns (NFR §5.2)
Every table has: `CREATED_BY`, `LAST_UPDATER`, `OPERATION_TIME`, `LAST_OPERATION`, `IS_DELETED`

### DTO Layer (NFR §3.3)
- ORM/Prisma model objects are never returned directly in API responses
- Request DTOs: Zod schemas in `src/lib/validations/`
- Response DTOs: TypeScript interfaces in `src/types/index.ts`

### Generic CRUD Pattern (NFR §3.2)
- Shared `api-response.ts` for all standardised HTTP responses
- Shared `audit.ts` for all audit field population
- Shared `api-client.ts` — all HTTP calls from frontend go through this module

### Weekly Effort Entry
- Week boundaries always computed as Monday 00:00:00 UTC
- Unique constraint: one entry per user per week (upsert on re-submit)
- Three percentages must sum to exactly 100 (validated at all 3 layers)

## Data Model

```
Team
  id, name
  audit: createdBy, lastUpdater, operationTime, lastOperation, isDeleted

User
  id, email, passwordHash, fullName, role (USER|ADMIN)
  teamId → Team
  audit columns

EffortEntry
  id, userId → User, weekStartDate
  pastPercentage, todayPercentage, futurePercentage  (sum = 100)
  notes?
  UNIQUE(userId, weekStartDate)
  audit columns

RefreshToken
  id, token (jti), userId → User
  expiresAt, revokedAt?
```

## Security Model (NFR §4)

| Layer | Mechanism |
|---|---|
| Route | Edge Middleware: JWT validation on every request |
| API | Re-validates JWT in route handler; role check for admin endpoints |
| Frontend | Route guard built into `(app)/layout.tsx` |
| Data | Input validation: Zod (API) + DB constraints |
| Tokens | HttpOnly cookie, short-lived (1h access / 24h refresh) |
| Passwords | bcryptjs, 12 salt rounds |

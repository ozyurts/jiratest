# Development Guide — Workload Tracker

## Local Setup

```bash
git clone <repo-url>
cd workload-tracker
npm install
cp .env.example .env.local   # then fill in JWT_SECRET
npm run db:push              # create SQLite dev.db
npm run db:seed              # load dev seed data
npm run dev                  # http://localhost:3000
```

## Branching Strategy (NFR §DevOps)

```
main          — production-ready code; never commit directly
feature/*     — new features
fix/*         — bug fixes
refactor/*    — refactoring
```

All changes go through Pull Requests. `main` is protected.

## Commit Convention

```
feat:     new feature
fix:      bug fix
refactor: code restructure, no behaviour change
docs:     documentation only
test:     test additions/changes
chore:    build, deps, tooling
```

## Adding a New Resource

1. Add Prisma model to `prisma/schema.prisma` (include all 5 audit columns + `isDeleted`)
2. Run `npm run db:migrate -- --name add_<resource>`
3. Add Zod schema to `src/lib/validations/<resource>.ts`
4. Add DTO type to `src/types/index.ts`
5. Create API routes in `src/app/api/v1/<resource>/`
6. Add client methods to `src/lib/api-client.ts`
7. Create UI component(s) in `src/components/<domain>/`
8. Create page in `src/app/(app)/<resource>/page.tsx`
9. Update `API-DOCUMENTATION.md`

## Code Standards

### Backend (API routes)
- Business logic stays in route handlers (serverless architecture; service classes would be over-engineering)
- All queries use `isDeleted: "NO"` filter
- All mutations populate audit columns via `createAudit()` / `updateAudit()` / `deleteAudit()`
- Wrap multi-step writes in `prisma.$transaction()`
- Return standardised DTOs via helpers in `api-response.ts`

### Frontend (pages / components)
- No `fetch()` calls in components — use `api-client.ts`
- No business logic in templates — conditionals and data mapping only
- All errors displayed through `<ErrorAlert />` component
- Auth token is managed exclusively by the cookie; never read/write it from frontend JS

### Validation — Triple Layer (NFR §4.3)
1. **Frontend**: Zod schema client-side before submit
2. **API**: Zod schema in route handler before Prisma
3. **Database**: Prisma schema constraints

## Running Tests

```bash
npm test              # Unit tests (Jest)
npm run test:coverage # With coverage report (min 70%)
npm run e2e           # Playwright E2E tests
```

## Database Commands

```bash
npm run db:migrate    # Create and apply migration (dev)
npm run db:push       # Push schema without migration file (prototyping)
npm run db:seed       # (Re-)seed dev data (idempotent)
npm run db:studio     # Open Prisma Studio at http://localhost:5555
```

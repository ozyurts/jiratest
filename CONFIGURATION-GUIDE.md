# Configuration Guide — Workload Tracker

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `file:./dev.db` | Database connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | No | `3600` | Access token TTL in seconds (max 3600) |
| `JWT_REFRESH_EXPIRES_IN` | No | `86400` | Refresh token TTL in seconds (max 86400) |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL |

## Profile Differences

### Dev (`NODE_ENV=development`)
- Database: SQLite (`file:./dev.db`)
- Auth: JWT with dev secret from `.env.local`
- Logging: DEBUG level (query logs enabled in Prisma)
- Seed data available

### Prod (`NODE_ENV=production`)
- Database: PostgreSQL (set `DATABASE_URL` via Vercel environment variables)
- Auth: JWT secret from Vercel environment variables (never committed)
- Logging: INFO + ERROR only
- **NO seed data loaded**

## Generating a Secure JWT Secret

```bash
openssl rand -base64 64
# or
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## Vercel Configuration

1. Go to Project Settings → Environment Variables
2. Add `DATABASE_URL` (Neon / Vercel Postgres connection string)
3. Add `JWT_SECRET` (generated above)
4. Optionally override `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`

## Database Migration (Prod)

After first deploy or schema changes:
```bash
# Locally, targeting prod DB:
DATABASE_URL="<prod-connection-string>" npx prisma migrate deploy
```

Or use Vercel's "Build & Development Settings" to run migrate as a post-deploy hook.

## CORS

Configured in `next.config.ts`. Prod: only registered frontend domain allowed. No wildcard `*`.

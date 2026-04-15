# API Documentation — Workload Tracker

Base path: `/api/v1/`  
All timestamps are **UTC ISO 8601**.  
All protected endpoints require valid JWT in `wt_access` HttpOnly cookie.

---

## Auth

### POST /api/v1/auth/register
Self-registration. Returns user profile + sets auth cookies.

**Request body**
```json
{
  "email": "string (required)",
  "password": "string (min 8, uppercase + lowercase + digit required)",
  "fullName": "string (min 2)",
  "teamId": "string | null (optional)"
}
```

**Response 201**
```json
{ "data": { "id": "...", "email": "...", "fullName": "...", "role": "USER", "teamId": "...", "teamName": "..." }, "timestamp": "..." }
```

**Errors**: 400 (validation), 409 (email exists)

---

### POST /api/v1/auth/login
**Request body**: `{ "email": "...", "password": "..." }`  
**Response 200**: Same as register.  
**Errors**: 400 (validation), 401 (invalid credentials)

---

### POST /api/v1/auth/logout
No body. Revokes refresh token, clears cookies.  
**Response 200**: `{ "data": { "message": "Başarıyla çıkış yapıldı." }, "timestamp": "..." }`

---

### GET /api/v1/auth/me
Returns current user profile.  
**Response 200**: MeDto  
**Errors**: 401, 404

---

## Teams

### GET /api/v1/teams
List all active teams.  
**Auth**: Any authenticated user  
**Response 200**: `{ "data": [TeamDto], "timestamp": "..." }`

---

### POST /api/v1/teams
Create a team.  
**Auth**: ADMIN only  
**Request**: `{ "name": "string" }`  
**Response 201**: TeamDto  
**Errors**: 400, 403, 409

---

### PUT /api/v1/teams/:id
Update team name.  
**Auth**: ADMIN  
**Request**: `{ "name": "string" }`  
**Response 200**: TeamDto

---

### DELETE /api/v1/teams/:id
Soft-delete a team.  
**Auth**: ADMIN  
**Response 200**: TeamDto (with `isDeleted: "YES"`)

---

## Users

### GET /api/v1/users
List users (paginated).  
**Auth**: ADMIN  
**Query**: `page`, `pageSize`, `teamId`  
**Response 200**: Paginated UserDto

---

### PUT /api/v1/users/:id
Update user role / team.  
**Auth**: ADMIN  
**Request**: `{ "role"?: "USER"|"ADMIN", "teamId"?: string|null, "fullName"?: string }`  
**Response 200**: UserDto

---

### DELETE /api/v1/users/:id
Soft-delete user. Cannot delete own account.  
**Auth**: ADMIN  
**Response 200**: UserDto (soft-deleted)

---

## Efforts

### POST /api/v1/efforts
Create or update (upsert) weekly effort entry.  
**Auth**: Any authenticated user  
**Request**:
```json
{
  "weekStartDate": "YYYY-MM-DD",
  "pastPercentage": 0-100,
  "todayPercentage": 0-100,
  "futurePercentage": 0-100,
  "notes": "string | null (max 500)"
}
```
*pastPercentage + todayPercentage + futurePercentage must equal 100.*  
**Response 201/200**: EffortEntryDto

---

### GET /api/v1/efforts/my
Current user's own effort history (paginated).  
**Query**: `page`, `pageSize`  
**Response 200**: Paginated EffortEntryDto

---

### GET /api/v1/efforts
All efforts (paginated, filterable).  
**Auth**: ADMIN  
**Query**: `page`, `pageSize`, `userId`, `teamId`, `weekFrom`, `weekTo`  
**Response 200**: Paginated EffortEntryDto

---

### GET /api/v1/efforts/dashboard
Aggregated dashboard data for admin.  
**Auth**: ADMIN  
**Query**: `teamId?`, `weeks?` (default 12)  
**Response 200**:
```json
{
  "data": {
    "teamAverages": [WeeklyAverageDto],
    "memberSummaries": [MemberSummaryDto]
  }
}
```

---

### GET /api/v1/efforts/trends
Weekly trend data.  
**Auth**: ADMIN  
**Query**: `userId?`, `teamId?`, `weeks?` (default 12)  
**Response 200**: `{ "data": [WeeklyAverageDto] }`

---

## Health

### GET /api/health
Liveness check.  
**Response 200**: `{ "status": "ok", "timestamp": "..." }`  
**Response 503**: `{ "status": "error", "timestamp": "..." }`

---

## Common Error Response (NFR §3.3)

```json
{
  "message": "Human-readable error message",
  "details": { "fieldName": ["Validation message"] },
  "timestamp": "2025-04-14T10:00:00.000Z"
}
```

| HTTP Code | Meaning |
|---|---|
| 400 | Validation failure |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 500 | Unexpected server error |

/**
 * Shared TypeScript types / DTOs for the Workload Tracker application.
 * NFR §3.3 — all API contracts use Request DTOs (inbound) and Response DTOs (outbound).
 * ORM/DB model objects are NEVER exposed directly.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "USER" | "ADMIN";

// ── Audit (common to all response DTOs) ─────────────────────────────────────

export interface AuditDto {
  id: string;
  createdBy: string;
  lastUpdater: string;
  operationTime: string; // ISO UTC string
  isDeleted: "YES" | "NO";
}

// ── Team ─────────────────────────────────────────────────────────────────────

export interface TeamDto extends AuditDto {
  name: string;
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface UserDto extends AuditDto {
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string | null;
  teamName: string | null;
}

export interface MeDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string | null;
  teamName: string | null;
}

// ── Effort Entry ─────────────────────────────────────────────────────────────

export interface EffortEntryDto extends AuditDto {
  userId: string;
  userFullName: string;
  teamId: string | null;
  teamName: string | null;
  weekStartDate: string; // ISO date string: "YYYY-MM-DD"
  pastPercentage: number;
  todayPercentage: number;
  futurePercentage: number;
  notes: string | null;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface WeeklyAverageDto {
  weekStartDate: string;
  pastAvg: number;
  todayAvg: number;
  futureAvg: number;
  entryCount: number;
}

export interface MemberSummaryDto {
  userId: string;
  fullName: string;
  teamId: string | null;
  teamName: string | null;
  latestWeek: string | null;
  pastPercentage: number | null;
  todayPercentage: number | null;
  futurePercentage: number | null;
}

export interface DashboardDto {
  teamAverages: WeeklyAverageDto[];
  memberSummaries: MemberSummaryDto[];
}

// ── API pagination wrapper ────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiPage<T> {
  data: T[];
  pagination: Pagination;
  timestamp: string;
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

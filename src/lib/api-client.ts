/**
 * Centralised HTTP client for the frontend.
 * NFR §3.4 — UI components NEVER call fetch/HTTP directly.
 * All API calls go through this module.
 */

import type {
  MeDto, TeamDto, UserDto, EffortEntryDto,
  DashboardDto, WeeklyAverageDto,
  ApiResponse, ApiPage,
} from "@/types";

const BASE = "/api/v1";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Bir hata oluştu." }));
    throw Object.assign(new Error(err.message ?? "Bir hata oluştu."), {
      status: res.status,
      details: err.details,
    });
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; password: string; fullName: string; teamId?: string | null }) =>
    request<ApiResponse<MeDto>>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<ApiResponse<MeDto>>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () =>
    request<ApiResponse<{ message: string }>>("/auth/logout", { method: "POST" }),

  me: () =>
    request<ApiResponse<MeDto>>("/auth/me"),
};

// ── Teams ─────────────────────────────────────────────────────────────────────

export const teamsApi = {
  list: () =>
    request<ApiResponse<TeamDto[]>>("/teams"),

  create: (data: { name: string }) =>
    request<ApiResponse<TeamDto>>("/teams", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: { name: string }) =>
    request<ApiResponse<TeamDto>>(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<ApiResponse<TeamDto>>(`/teams/${id}`, { method: "DELETE" }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: { page?: number; pageSize?: number; teamId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.teamId) qs.set("teamId", params.teamId);
    return request<ApiPage<UserDto>>(`/users?${qs}`);
  },

  update: (id: string, data: { fullName?: string; teamId?: string | null; role?: "USER" | "ADMIN" }) =>
    request<ApiResponse<UserDto>>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<ApiResponse<UserDto>>(`/users/${id}`, { method: "DELETE" }),
};

// ── Efforts ───────────────────────────────────────────────────────────────────

export const effortsApi = {
  save: (data: {
    weekStartDate: string;
    pastPercentage: number;
    todayPercentage: number;
    futurePercentage: number;
    notes?: string | null;
  }) =>
    request<ApiResponse<EffortEntryDto>>("/efforts", { method: "POST", body: JSON.stringify(data) }),

  myHistory: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    return request<ApiPage<EffortEntryDto>>(`/efforts/my?${qs}`);
  },

  adminList: (params?: {
    page?: number; pageSize?: number;
    userId?: string; teamId?: string;
    weekFrom?: string; weekTo?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.teamId) qs.set("teamId", params.teamId);
    if (params?.weekFrom) qs.set("weekFrom", params.weekFrom);
    if (params?.weekTo) qs.set("weekTo", params.weekTo);
    return request<ApiPage<EffortEntryDto>>(`/efforts?${qs}`);
  },

  dashboard: (params?: { teamId?: string; weeks?: number }) => {
    const qs = new URLSearchParams();
    if (params?.teamId) qs.set("teamId", params.teamId);
    if (params?.weeks) qs.set("weeks", String(params.weeks));
    return request<ApiResponse<DashboardDto>>(`/efforts/dashboard?${qs}`);
  },

  trends: (params?: { userId?: string; teamId?: string; weeks?: number }) => {
    const qs = new URLSearchParams();
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.teamId) qs.set("teamId", params.teamId);
    if (params?.weeks) qs.set("weeks", String(params.weeks));
    return request<ApiResponse<WeeklyAverageDto[]>>(`/efforts/trends?${qs}`);
  },
};

/**
 * Standardised API response helpers (NFR §3.3, §4.4, §6.1)
 * All responses use ErrorResponse DTO: { message, details, timestamp }
 */
import { NextResponse } from "next/server";

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface ErrorResponse {
  message: string;
  details?: Record<string, string[]> | string;
  timestamp: string;
}

export interface SuccessResponse<T> {
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  const body: SuccessResponse<T> = {
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function paginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse {
  const body: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 200 });
}

export function badRequest(
  message: string,
  details?: Record<string, string[]>
): NextResponse {
  const body: ErrorResponse = {
    message,
    details,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 400 });
}

export function unauthorized(message = "Kimlik doğrulama gerekli."): NextResponse {
  const body: ErrorResponse = {
    message,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 401 });
}

export function forbidden(message = "Bu işlem için yetkiniz bulunmuyor."): NextResponse {
  const body: ErrorResponse = {
    message,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 403 });
}

export function notFound(message = "Kaynak bulunamadı."): NextResponse {
  const body: ErrorResponse = {
    message,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 404 });
}

export function conflict(message: string): NextResponse {
  const body: ErrorResponse = {
    message,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 409 });
}

export function internalError(): NextResponse {
  const body: ErrorResponse = {
    message: "Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: 500 });
}

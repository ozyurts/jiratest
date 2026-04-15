/**
 * Structured logging utility (NFR §7.4)
 * - INFO: significant business operations
 * - DEBUG: request/response details (dev only)
 * - ERROR: unhandled exceptions
 * Never logs passwords, tokens, or sensitive PII.
 */

type LogLevel = "info" | "debug" | "error" | "warn";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else if (level === "debug" && process.env.NODE_ENV !== "production") {
    console.debug(JSON.stringify(entry));
  } else if (level === "info") {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
};

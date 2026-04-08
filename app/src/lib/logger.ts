/**
 * KLAR Structured Logger
 *
 * Production-grade structured logging with JSON output for Vercel Log Drain.
 * Supports log levels, request context, and automatic error serialization.
 * In production, logs are JSON-formatted for parsing by Vercel/Datadog/Sentry.
 * In development, logs are human-readable.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  plan?: string;
  ip?: string;
  path?: string;
  duration?: number;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || "info"] ?? 1;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: IS_PRODUCTION ? err.stack?.split("\n").slice(0, 5).join("\n") : err.stack,
    };
  }
  return { message: String(err) };
}

function emit(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  if (LOG_LEVELS[level] < MIN_LEVEL) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "klar",
    message,
    ...context,
    ...(error ? { error: serializeError(error) } : {}),
  };

  if (IS_PRODUCTION) {
    // JSON lines format — parseable by Vercel Log Drain, Datadog, Sentry
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } else {
    // Human-readable dev output
    const prefix = `[${level.toUpperCase()}]`;
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    if (level === "error") console.error(prefix, message, ctx, error || "");
    else if (level === "warn") console.warn(prefix, message, ctx);
    else console.log(prefix, message, ctx);
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: LogContext, err?: unknown) => emit("error", msg, ctx, err),

  /** Create a child logger with bound context (e.g., requestId, userId) */
  child: (baseCtx: LogContext) => ({
    debug: (msg: string, ctx?: LogContext) => emit("debug", msg, { ...baseCtx, ...ctx }),
    info: (msg: string, ctx?: LogContext) => emit("info", msg, { ...baseCtx, ...ctx }),
    warn: (msg: string, ctx?: LogContext) => emit("warn", msg, { ...baseCtx, ...ctx }),
    error: (msg: string, ctx?: LogContext, err?: unknown) => emit("error", msg, { ...baseCtx, ...ctx }, err),
  }),
};

import { AsyncLocalStorage } from "node:async_hooks";
import pino, { type DestinationStream, type Logger as PinoLogger } from "pino";
import { env } from "~/env.server";

const REDACTED = "[Redacted]";

const sensitiveKeys = new Set([
  "accesstoken",
  "apikey",
  "authorization",
  "body",
  "cookie",
  "data",
  "email",
  "from",
  "html",
  "jwt",
  "password",
  "passwordhash",
  "payload",
  "proxyauthorization",
  "refreshsecret",
  "refreshtoken",
  "req",
  "request",
  "res",
  "response",
  "secret",
  "setcookie",
  "subject",
  "text",
  "to",
  "token",
  "tokenhash",
]);

const logContext = new AsyncLocalStorage<LogFields>();

export type LogFields = Record<string, unknown>;

export type AppLogger = {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, error: unknown, fields?: LogFields): void;
  fatal(event: string, error: unknown, fields?: LogFields): void;
};

type CreateLoggerOptions = {
  destination?: DestinationStream;
};

function normalizedKey(key: string): string {
  return key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function redactString(value: string): string {
  return value
    .replaceAll(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replaceAll(
      /([?&](?:access_token|api_key|code|key|password|refresh_token|secret|signature|token)=)[^&#\s]+/gi,
      `$1${REDACTED}`,
    )
    .replaceAll(/(https?:\/\/[^:\s/@]+:)[^@\s/]+@/gi, `$1${REDACTED}@`)
    .replaceAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED)
    .replaceAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[Redacted email address]");
}

function serializeError(error: unknown, seen: WeakSet<object>): LogFields {
  if (!(error instanceof Error)) {
    return { type: typeof error, message: redactString(String(error)) };
  }

  const serialized: LogFields = {
    type: error.name,
    message: redactString(error.message),
  };

  if (error.stack) serialized.stack = redactString(error.stack);
  if (error.cause !== undefined) serialized.cause = sanitizeValue(error.cause, seen);

  return serialized;
}

function sanitizeValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value, seen);
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  const sanitized: LogFields = {};
  for (const [key, item] of Object.entries(value)) {
    sanitized[key] = sensitiveKeys.has(normalizedKey(key)) ? REDACTED : sanitizeValue(item, seen);
  }
  return sanitized;
}

function sanitizedFields(fields: LogFields): LogFields {
  return sanitizeValue(fields) as LogFields;
}

function createPinoLogger(service: string, destination?: DestinationStream): PinoLogger {
  const options: pino.LoggerOptions = {
    base: { service },
    level: env.LOG_LEVEL_THRESHOLD,
    formatters: {
      level: (level) => ({ level }),
    },
    mixin: () => sanitizedFields(logContext.getStore() ?? {}),
    redact: {
      paths: [
        "accessToken",
        "apiKey",
        "authorization",
        "cookie",
        "email",
        "password",
        "refreshToken",
        "secret",
        "token",
        "*.accessToken",
        "*.apiKey",
        "*.authorization",
        "*.cookie",
        "*.email",
        "*.password",
        "*.refreshToken",
        "*.secret",
        "*.token",
      ],
      censor: REDACTED,
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  };

  if (!destination && env.NODE_ENV === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        messageKey: "event",
        singleLine: true,
        translateTime: "SYS:standard",
      },
    };
  }

  return destination ? pino(options, destination) : pino(options);
}

export function createLogger(service: string, options: CreateLoggerOptions = {}): AppLogger {
  const logger = createPinoLogger(service, options.destination);

  return {
    debug(event, fields = {}) {
      logger.debug({ ...sanitizedFields(fields), event });
    },
    info(event, fields = {}) {
      logger.info({ ...sanitizedFields(fields), event });
    },
    warn(event, fields = {}) {
      logger.warn({ ...sanitizedFields(fields), event });
    },
    error(event, error, fields = {}) {
      logger.error({
        ...sanitizedFields(fields),
        event,
        error: serializeError(error, new WeakSet()),
      });
    },
    fatal(event, error, fields = {}) {
      logger.fatal({
        ...sanitizedFields(fields),
        event,
        error: serializeError(error, new WeakSet()),
      });
    },
  };
}

export function runWithLogContext<Result>(context: LogFields, callback: () => Result): Result {
  const current = logContext.getStore() ?? {};
  return logContext.run({ ...current, ...sanitizedFields(context) }, callback);
}

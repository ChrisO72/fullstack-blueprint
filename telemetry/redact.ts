import type { BrowserOptions } from "@sentry/react-router";

export function sanitizeText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s<>"']+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${sanitizePath(parsed.pathname)}`;
      } catch {
        return "[URL]";
      }
    })
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\bBearer\s+[^\s"',;]+/gi, "Bearer [redacted]")
    .replace(
      /((?:password|secret|token|authorization|api[_-]?key)\s*["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1[redacted]",
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/(Failed query:)[\s\S]*/gi, "$1 [redacted; see exception cause]")
    .replace(/(parameters?|params|detail):[^\n]*/gi, "$1: [redacted]")
    .slice(0, 8192);
}

function sanitizePath(path: string): string {
  return path
    .replace(/(\/(?:reset-password|confirm-email|verify-email)\/)[^/]+/gi, "$1[redacted]")
    .replace(/\/[a-zA-Z0-9_-]{24,}(?=\/|$)/g, "/[redacted]");
}

export function sanitizeUrl(value: string): string {
  return sanitizeText(sanitizePath(value.split(/[?#]/)[0]));
}

// Replay's compressed DOM metadata cannot be rewritten by beforeAddRecordingEvent.
// Drop a segment if its navigation URLs need scrubbing, rather than send a raw URL there.
export function isSafeReplayUrls(urls: unknown): boolean {
  return (
    Array.isArray(urls) &&
    urls.every((url: unknown) => typeof url === "string" && sanitizeUrl(url) === url)
  );
}

export function sanitizeBreadcrumbData(data: Record<string, unknown> = {}) {
  const result = sanitizeAttributes(data);
  for (const key of ["url", "from", "to"]) {
    if (typeof data[key] === "string") result[key] = sanitizeUrl(data[key]);
  }
  for (const key of ["method", "status_code", "type"]) {
    const value = data[key];
    if (typeof value === "string") result[key] = sanitizeText(value);
    else if (typeof value === "number") result[key] = value;
  }
  return result;
}

const allowedAttributes = new Set([
  "http.request.method",
  "http.response.status_code",
  "http.route",
  "http.method",
  "http.status_code",
  "url.full",
  "url.path",
  "db.system",
  "db.system.name",
  "db.operation",
  "db.operation.name",
  "db.collection.name",
  "messaging.system",
  "messaging.destination.name",
  "messaging.message.id",
  "messaging.message.retry.count",
  "job.name",
  "job.id",
  "job.attempt",
  "outcome",
  "reason",
  "exitCode",
  "fileId",
  "failMode",
  "queueName",
  "error.type",
  "durationMs",
  "service",
  "runtime",
  "environment",
  "release",
  "trace_id",
  "span_id",
  "sentry.op",
  "sentry.origin",
  "sentry.kind",
  "sentry.sample_rate",
  "sentry.release",
  "sentry.environment",
  "sentry.sdk.name",
  "sentry.sdk.version",
  "sentry.replay_id",
  "sentry.trace.parent_span_id",
  "sentry.segment.id",
  "sentry.segment.name",
  "sentry.exclusive_time",
  "sentry.segment.name.source",
  "sentry.description",
  "code.function.name",
  "react_router.route.id",
  "react_router.middleware.name",
  "react_router.middleware.index",
]);

export function sanitizeAttributes(
  attributes: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(
        ([key, value]) =>
          allowedAttributes.has(key) && ["string", "number", "boolean"].includes(typeof value),
      )
      .map(([key, value]) => [
        key,
        typeof value === "string"
          ? key.startsWith("url.") || key === "sentry.description"
            ? sanitizeUrl(value)
            : sanitizeText(value)
          : (value as number | boolean),
      ]),
  );
}

// SDK hooks run for automatically collected data as well as explicit application logs.
export const privacyOptions = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console") return null;
    return {
      ...breadcrumb,
      message: breadcrumb.message ? sanitizeText(breadcrumb.message) : undefined,
      data: sanitizeBreadcrumbData(breadcrumb.data),
    };
  },
  beforeSend(event) {
    if (event.message) event.message = sanitizeText(event.message);
    if (event.logentry) {
      event.logentry = { message: sanitizeText(event.logentry.message ?? "") };
    }
    if (event.request) {
      event.request = {
        method: event.request.method,
        url: event.request.url ? sanitizeText(event.request.url) : undefined,
      };
    }
    delete event.user;
    delete event.extra;
    if (event.transaction) event.transaction = sanitizeUrl(event.transaction);
    if (event.contexts) {
      const trace = event.contexts.trace;
      event.contexts = {
        trace: trace ? { ...trace, data: sanitizeAttributes(trace.data) } : undefined,
      };
    }
    event.tags = sanitizeAttributes(event.tags);
    for (const exception of event.exception?.values ?? []) {
      if (exception.value) exception.value = sanitizeText(exception.value);
      for (const frame of exception.stacktrace?.frames ?? []) {
        delete frame.vars;
        if (frame.filename) frame.filename = sanitizeText(frame.filename);
        if (frame.abs_path) frame.abs_path = sanitizeText(frame.abs_path);
        if (frame.context_line) frame.context_line = sanitizeText(frame.context_line);
        frame.pre_context = frame.pre_context?.map(sanitizeText);
        frame.post_context = frame.post_context?.map(sanitizeText);
      }
    }
    return event;
  },
  beforeSendLog(log) {
    log.message = sanitizeText(log.message);
    log.attributes = sanitizeAttributes(log.attributes);
    return log;
  },
  beforeSendMetric(metric) {
    metric.attributes = sanitizeAttributes(metric.attributes);
    return metric;
  },
  beforeSendSpan(span) {
    span.attributes = sanitizeAttributes(span.attributes);
    span.name = sanitizeText(span.name);
    // Queries and Redis commands can embed credentials or queue payloads in descriptions.
    if (String(span.attributes["sentry.op"] ?? "").startsWith("db")) {
      delete span.attributes["sentry.description"];
      span.name = String(
        span.attributes["db.operation.name"] ?? span.attributes["db.operation"] ?? "database",
      );
    }
    return span;
  },
} satisfies Partial<BrowserOptions>;

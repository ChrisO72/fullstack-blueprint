import * as Sentry from "@sentry/node";
import { sanitizeAttributes, sanitizeText } from "./redact.ts";

type Attributes = Record<string, string | number | boolean>;

function emit(level: "info" | "warn" | "error", message: string, attributes?: Attributes) {
  const fields = sanitizeAttributes(attributes);
  const text = sanitizeText(message);
  if (Sentry.isEnabled()) Sentry.logger[level](text, fields);
  else console[level](text, fields);
}

export function reportError(message: string, error: unknown, attributes?: Attributes) {
  emit("error", message, attributes);
  if (Sentry.isEnabled()) {
    Sentry.withScope((scope) => {
      scope.setTags(sanitizeAttributes(attributes));
      Sentry.captureException(error);
    });
  } else if (error instanceof Error) {
    console.error(sanitizeText(error.stack ?? error.message));
  }
}

export const log = {
  info: (message: string, attributes?: Attributes) => emit("info", message, attributes),
  warn: (message: string, attributes?: Attributes) => emit("warn", message, attributes),
  error: reportError,
};

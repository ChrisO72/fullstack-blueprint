import { context, type Attributes } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { sanitizeAttributes, sanitizeError, sanitizeText } from "./sanitize.server";

function emit(
  severity: "INFO" | "WARN" | "ERROR",
  message: string,
  attributes: Attributes = {},
  error?: unknown,
) {
  const safeError = error === undefined ? undefined : sanitizeError(error);
  logs.getLogger("blueprint").emit({
    context: context.active(),
    severityNumber: SeverityNumber[severity],
    severityText: severity,
    body: sanitizeText(message),
    attributes: {
      ...sanitizeAttributes(attributes),
      ...(safeError
        ? { "error.type": safeError.name, "exception.message": safeError.message }
        : {}),
    },
  });
}

export const log = {
  info: (message: string, attributes?: Attributes) => emit("INFO", message, attributes),
  warn: (message: string, attributes?: Attributes) => emit("WARN", message, attributes),
  error: (message: string, error: unknown, attributes?: Attributes) =>
    emit("ERROR", message, attributes, error),
};

import { createHash } from "node:crypto";
import type { Attributes, Exception } from "@opentelemetry/api";

// Export only known metadata. Never serialize arbitrary errors, payloads or SQL.
const allowed = new Set([
  "http.request.method",
  "http.response.status_code",
  "http.route",
  "http.method",
  "http.status_code",
  "network.protocol.version",
  "network.peer.port",
  "server.address",
  "server.port",
  "net.peer.name",
  "net.peer.port",
  "db.system",
  "db.system.name",
  "db.operation",
  "db.operation.name",
  "messaging.system",
  "messaging.destination.name",
  "messaging.operation.type",
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
]);

export function sanitizeText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s]+/gi, (value) => {
      try {
        return new URL(value).origin;
      } catch {
        return "[URL]";
      }
    })
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/(?:bearer\s+|(?:password|secret|token|authorization)\s*[:=]\s*)\S+/gi, "[credential]")
    .slice(0, 256);
}

export function sanitizeAttributes(attributes: Attributes): Attributes {
  return Object.fromEntries(
    Object.entries(attributes)
      .filter(([key, value]) => allowed.has(key) && !Array.isArray(value))
      .map(([key, value]) => [key, typeof value === "string" ? sanitizeText(value) : value]),
  );
}

export function sanitizeError(error: unknown): Exception & { name: string; message: string } {
  // Error messages/stacks from drivers and providers can contain SQL, tokens and payloads.
  const name =
    error instanceof Error && /^[A-Za-z][A-Za-z0-9]*Error$|^Error$/.test(error.name)
      ? error.name
      : "Error";
  return { name, message: "Operation failed" };
}

export function safeJobId(id: string): string {
  // Existing deterministic job IDs include confirmation/reset tokens.
  return createHash("sha256").update(id).digest("hex").slice(0, 24);
}

import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, runWithLogContext } from "~/observability/logger.server";

function captureLogger(service = "test") {
  let output = "";
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  return {
    logger: createLogger(service, { destination }),
    records() {
      return output
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    },
    output() {
      return output;
    },
  };
}

describe("structured logger", () => {
  it("writes machine-parseable service, level, event, and correlation fields", () => {
    const capture = captureLogger("web");

    runWithLogContext({ requestId: "request-123" }, () => {
      capture.logger.info("http.request.completed", {
        statusCode: 200,
        durationMs: 12,
      });
    });

    expect(capture.records()).toEqual([
      expect.objectContaining({
        service: "web",
        level: "info",
        event: "http.request.completed",
        requestId: "request-123",
        statusCode: 200,
        durationMs: 12,
        timestamp: expect.any(String),
      }),
    ]);
  });

  it("redacts sensitive fields recursively and sanitizes sensitive strings", () => {
    const capture = captureLogger();
    const secretToken = "raw-confirmation-token";
    const password = "raw-password";
    const email = "private@example.com";

    capture.logger.info("redaction.test", {
      nested: {
        deeper: {
          token: secretToken,
          password,
          contact: email,
          url: `https://example.com/confirm?token=${secretToken}`,
        },
      },
      payload: { safe: "value" },
    });

    expect(capture.output()).not.toContain(secretToken);
    expect(capture.output()).not.toContain(password);
    expect(capture.output()).not.toContain(email);
    expect(capture.records()[0]).toMatchObject({
      nested: {
        deeper: {
          token: "[Redacted]",
          password: "[Redacted]",
          contact: "[Redacted email address]",
          url: "https://example.com/confirm?token=[Redacted]",
        },
      },
      payload: "[Redacted]",
    });
  });

  it("includes normalized, redacted error metadata", () => {
    const capture = captureLogger("worker");
    const error = new Error(
      "Provider rejected private@example.com at https://example.com/send?token=raw-token",
    );

    runWithLogContext({ jobId: "job-123", jobName: "sendConfirmationEmail" }, () => {
      capture.logger.error("mail.send.failed", error);
    });

    const [record] = capture.records();
    expect(record).toMatchObject({
      service: "worker",
      level: "error",
      event: "mail.send.failed",
      jobId: "job-123",
      jobName: "sendConfirmationEmail",
      error: {
        type: "Error",
        message:
          "Provider rejected [Redacted email address] at https://example.com/send?token=[Redacted]",
        stack: expect.any(String),
      },
    });
    expect(capture.output()).not.toContain("private@example.com");
    expect(capture.output()).not.toContain("raw-token");
  });
});

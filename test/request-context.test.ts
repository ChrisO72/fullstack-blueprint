import { describe, expect, it } from "vitest";
import { resolveRequestId } from "~/lib/request-context.server";

describe("request correlation", () => {
  it("preserves a valid incoming request ID", () => {
    const request = new Request("https://example.com", {
      headers: { "X-Request-ID": "upstream.request-123" },
    });

    expect(resolveRequestId(request)).toBe("upstream.request-123");
  });

  it("replaces missing or unsafe request IDs", () => {
    const missing = resolveRequestId(new Request("https://example.com"));
    const unsafe = resolveRequestId(
      new Request("https://example.com", {
        headers: { "X-Request-ID": "unsafe request value" },
      }),
    );

    expect(missing).toMatch(/^[0-9a-f-]{36}$/);
    expect(unsafe).toMatch(/^[0-9a-f-]{36}$/);
    expect(unsafe).not.toBe("unsafe request value");
  });
});

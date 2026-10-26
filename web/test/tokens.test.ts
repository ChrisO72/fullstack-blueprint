import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertRefreshToken, rotateRefreshToken } from "~/db/repositories/refreshTokens";
import { getUserById } from "~/db/repositories/users";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshAccessToken,
  REFRESH_TOKEN_MAX_AGE,
} from "~/lib/auth/tokens.server";

vi.mock("~/db/repositories/refreshTokens", () => ({
  insertRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
}));
vi.mock("~/db/repositories/users", () => ({ getUserById: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("refresh-token responses", () => {
  it("returns the database's canonical replacement for parallel refreshes", async () => {
    const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    const oldToken = generateRefreshToken(42);
    const tokenId = "f418ecbf-5f02-4521-922d-034a8cc74102";
    const replacement = generateRefreshToken(42, tokenId, issuedAt);
    vi.mocked(rotateRefreshToken).mockResolvedValue({
      id: 1,
      userId: 42,
      tokenId,
      issuedAt,
      tokenHash: hashRefreshToken(replacement),
      previousTokenHash: hashRefreshToken(oldToken),
      previousValidUntil: new Date(issuedAt.getTime() + 10_000),
      expiresAt: new Date(issuedAt.getTime() + REFRESH_TOKEN_MAX_AGE * 1000),
      createdAt: issuedAt,
    });
    vi.mocked(getUserById).mockResolvedValue({
      id: 42,
      email: "user@example.com",
      firstName: null,
      lastName: null,
      role: "user",
      organizationId: 1,
      emailConfirmedAt: issuedAt,
      createdAt: issuedAt,
      updatedAt: issuedAt,
      deletedAt: null,
    });

    const results = await Promise.all([refreshAccessToken(oldToken), refreshAccessToken(oldToken)]);
    expect(results.map((result) => result?.refreshToken)).toEqual([replacement, replacement]);
    expect(insertRefreshToken).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before accessing sessions", async () => {
    expect(await refreshAccessToken("invalid")).toBeNull();
    expect(rotateRefreshToken).not.toHaveBeenCalled();
  });

  it("does not create a session when the database rejects a revoked or stale token", async () => {
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);
    expect(await refreshAccessToken(generateRefreshToken(42))).toBeNull();
    expect(getUserById).not.toHaveBeenCalled();
    expect(insertRefreshToken).not.toHaveBeenCalled();
  });
});

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "~/db/db";
import { findRefreshTokenByHash } from "~/db/repositories/refreshTokens";
import { refreshTokens } from "~/db/schema/auth";
import {
  createTokens,
  hashRefreshToken,
  refreshAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "~/lib/auth/tokens.server";
import { createTestOrganization, createTestUser } from "./fixtures";

describe("refresh-token lifecycle", () => {
  it("stores a hash, rotates the token, and rejects reuse", async () => {
    const organization = await createTestOrganization("Token test");
    const user = await createTestUser(organization.id, "tokens@example.com");

    const tokens = await createTokens(user.id, user.email);

    expect(verifyAccessToken(tokens.accessToken)).toMatchObject({
      userId: user.id,
      email: user.email,
    });
    expect(verifyRefreshToken(tokens.refreshToken)).toMatchObject({ userId: user.id });

    const stored = await findRefreshTokenByHash(hashRefreshToken(tokens.refreshToken));
    expect(stored?.tokenHash).toBe(hashRefreshToken(tokens.refreshToken));
    expect(stored?.tokenHash).not.toBe(tokens.refreshToken);

    const rotated = await refreshAccessToken(tokens.refreshToken);
    expect(rotated).not.toBeNull();
    if (!rotated) throw new Error("Expected refresh token rotation to succeed");

    expect(await refreshAccessToken(tokens.refreshToken)).toBeNull();
    expect(verifyRefreshToken(rotated.refreshToken)).toMatchObject({ userId: user.id });
  });

  it("allows only one concurrent rotation of the same token", async () => {
    const organization = await createTestOrganization("Concurrent token test");
    const user = await createTestUser(organization.id, "concurrent-tokens@example.com");
    const tokens = await createTokens(user.id, user.email);

    const results = await Promise.all([
      refreshAccessToken(tokens.refreshToken),
      refreshAccessToken(tokens.refreshToken),
    ]);
    const successfulRotations = results.filter((result) => result !== null);

    expect(successfulRotations).toHaveLength(1);
    const [rotated] = successfulRotations;
    if (!rotated) throw new Error("Expected exactly one refresh token rotation to succeed");

    expect(await findRefreshTokenByHash(hashRefreshToken(tokens.refreshToken))).toBeNull();
    expect(await findRefreshTokenByHash(hashRefreshToken(rotated.refreshToken))).toMatchObject({
      userId: user.id,
    });
    expect(verifyRefreshToken(rotated.refreshToken)).toMatchObject({ userId: user.id });

    const storedTokens = await db
      .select({ tokenHash: refreshTokens.tokenHash })
      .from(refreshTokens)
      .where(eq(refreshTokens.userId, user.id));
    expect(storedTokens).toEqual([{ tokenHash: hashRefreshToken(rotated.refreshToken) }]);
  });
});

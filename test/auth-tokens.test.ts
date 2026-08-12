import { describe, expect, it } from "vitest";
import { findRefreshTokenByHash } from "~/db/repositories/refreshTokens";
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
});

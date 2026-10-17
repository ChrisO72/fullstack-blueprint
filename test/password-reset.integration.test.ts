import { describe, expect, it } from "vitest";
import { getUserById } from "~/db/repositories/users";
import { hashPassword, verifyPassword } from "~/lib/auth/password.server";
import {
  createPasswordResetToken,
  resetPassword,
  verifyPasswordResetToken,
} from "~/lib/auth/password-reset.server";
import { createTokens, refreshAccessToken } from "~/lib/auth/tokens.server";
import { createTestOrganization, createTestUser } from "./fixtures";

describe("password-reset lifecycle", () => {
  it("resets once and revokes existing refresh tokens", async () => {
    const organization = await createTestOrganization("Password reset test");
    const user = await createTestUser(
      organization.id,
      "password-reset@example.com",
      await hashPassword("old-password"),
    );
    const session = await createTokens(user.id, user.email);
    const resetToken = await createPasswordResetToken(user.id);

    expect(await verifyPasswordResetToken(resetToken)).toBe(true);
    expect(await resetPassword(resetToken, "new-password")).toBe(true);
    expect(await resetPassword(resetToken, "another-password")).toBe(false);
    expect(await refreshAccessToken(session.refreshToken)).toBeNull();

    const updatedUser = await getUserById(user.id);
    expect(updatedUser?.passwordHash).toBeTruthy();
    expect(await verifyPassword("new-password", updatedUser?.passwordHash ?? "")).toBe(true);
  });
});

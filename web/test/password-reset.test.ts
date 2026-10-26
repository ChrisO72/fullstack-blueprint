import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumePasswordResetToken,
  findPasswordResetToken,
} from "~/db/repositories/passwordResetTokens";
import { hashPassword } from "~/lib/auth/password.server";
import { resetPassword } from "~/lib/auth/password-reset.server";
import { checkAuthRateLimit } from "~/lib/rate-limit.server";

vi.mock("~/db/repositories/passwordResetTokens", () => ({
  findPasswordResetToken: vi.fn(),
  consumePasswordResetToken: vi.fn(),
}));
vi.mock("~/lib/auth/password.server", () => ({ hashPassword: vi.fn() }));
vi.mock("~/lib/rate-limit.server", () => ({ checkAuthRateLimit: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

describe("password-reset completion", () => {
  it("rejects invalid or expired tokens without hashing a password", async () => {
    vi.mocked(findPasswordResetToken).mockResolvedValue(null);
    expect(await resetPassword("invalid", "new password")).toEqual({ status: "invalid" });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(checkAuthRateLimit).not.toHaveBeenCalled();
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it("limits valid-token attempts before hashing", async () => {
    vi.mocked(findPasswordResetToken).mockResolvedValue({
      id: 1,
      userId: 42,
      tokenHash: "stored-hash",
      createdAt: new Date(),
      expiresAt: new Date(),
    });
    vi.mocked(checkAuthRateLimit).mockResolvedValue({ allowed: false, retryAfterSeconds: 60 });
    expect(await resetPassword("valid", "new password")).toEqual({
      status: "rate-limited",
      retryAfterSeconds: 60,
    });
    expect(checkAuthRateLimit).toHaveBeenCalledWith({
      action: "password-reset-complete",
      account: "42",
    });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(consumePasswordResetToken).not.toHaveBeenCalled();
  });

  it("requires atomic token consumption even after initial validation", async () => {
    vi.mocked(findPasswordResetToken).mockResolvedValue({
      id: 1,
      userId: 42,
      tokenHash: "stored-hash",
      createdAt: new Date(),
      expiresAt: new Date(),
    });
    vi.mocked(checkAuthRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(hashPassword).mockResolvedValue("new-password-hash");
    vi.mocked(consumePasswordResetToken).mockResolvedValue(null);
    expect(await resetPassword("valid", "new password")).toEqual({ status: "invalid" });
    expect(consumePasswordResetToken).toHaveBeenCalledWith(expect.any(String), "new-password-hash");

    vi.mocked(consumePasswordResetToken).mockResolvedValue({ id: 42 });
    expect(await resetPassword("valid", "new password")).toEqual({ status: "success" });
  });
});

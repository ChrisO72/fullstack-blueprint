import crypto from "crypto";
import {
  consumePasswordResetToken,
  deletePasswordResetToken as deleteStoredPasswordResetToken,
  findPasswordResetToken,
  getLatestPasswordResetTokenCreatedAt,
  replacePasswordResetToken,
} from "~/db/repositories/passwordResetTokens";
import { hashPassword } from "./password.server";
import { checkAuthRateLimit } from "../rate-limit.server";

export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1;
export const PASSWORD_RESET_REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function canCreatePasswordResetToken(userId: number): Promise<boolean> {
  const lastCreatedAt = await getLatestPasswordResetTokenCreatedAt(userId);
  return (
    !lastCreatedAt || Date.now() - lastCreatedAt.getTime() >= PASSWORD_RESET_REQUEST_COOLDOWN_MS
  );
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await replacePasswordResetToken({ userId, tokenHash, expiresAt });
  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<boolean> {
  const row = await findPasswordResetToken(hashPasswordResetToken(token));
  return row !== null;
}

export async function deletePasswordResetToken(token: string): Promise<void> {
  await deleteStoredPasswordResetToken(hashPasswordResetToken(token));
}

type ResetPasswordResult =
  { status: "success" | "invalid" } | { status: "rate-limited"; retryAfterSeconds: number };

export async function resetPassword(token: string, password: string): Promise<ResetPasswordResult> {
  const tokenHash = hashPasswordResetToken(token);
  const stored = await findPasswordResetToken(tokenHash);
  if (!stored) return { status: "invalid" };

  const rateLimit = await checkAuthRateLimit({
    action: "password-reset-complete",
    account: String(stored.userId),
  });
  if (!rateLimit.allowed) {
    return { status: "rate-limited", retryAfterSeconds: rateLimit.retryAfterSeconds };
  }

  const passwordHash = await hashPassword(password);
  const user = await consumePasswordResetToken(tokenHash, passwordHash);
  return { status: user ? "success" : "invalid" };
}

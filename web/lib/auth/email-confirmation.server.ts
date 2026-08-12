import crypto from "crypto";
import {
  consumeEmailConfirmationToken,
  deleteEmailConfirmationToken as deleteStoredEmailConfirmationToken,
  replaceEmailConfirmationToken,
} from "~/db/repositories/emailConfirmationTokens";

export const CONFIRMATION_TOKEN_EXPIRY_HOURS = 24;

function hashEmailConfirmationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createEmailConfirmationToken(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const tokenHash = hashEmailConfirmationToken(token);
  const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await replaceEmailConfirmationToken({ userId, tokenHash, expiresAt });
  return token;
}

export async function deleteEmailConfirmationToken(token: string): Promise<void> {
  await deleteStoredEmailConfirmationToken(hashEmailConfirmationToken(token));
}

export async function confirmUserEmail(token: string) {
  return await consumeEmailConfirmationToken(hashEmailConfirmationToken(token));
}

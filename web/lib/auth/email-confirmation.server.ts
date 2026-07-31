import crypto from "crypto";
import {
  deleteEmailConfirmationToken,
  findEmailConfirmationToken,
  insertEmailConfirmationToken,
} from "~/db/repositories/emailConfirmationTokens";
import { getUserById, updateUser } from "~/db/repositories/users";

export const CONFIRMATION_TOKEN_EXPIRY_HOURS = 24;

export async function createEmailConfirmationToken(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await insertEmailConfirmationToken({ userId, token, expiresAt });
  return token;
}

export async function verifyEmailConfirmationToken(token: string) {
  const row = await findEmailConfirmationToken(token);
  if (!row) return null;

  return await getUserById(row.userId);
}

export async function confirmUserEmail(userId: number, token: string) {
  await updateUser(userId, { emailConfirmedAt: new Date() });
  await deleteEmailConfirmationToken(token);
}

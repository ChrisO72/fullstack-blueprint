import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createOrganization } from "../../db/repositories/organizations";
import {
  countUsers,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
} from "../../db/repositories/users";
import {
  deleteRefreshToken,
  findRefreshToken,
  insertRefreshToken,
} from "../../db/repositories/refreshTokens";
import {
  deleteEmailConfirmationToken,
  findEmailConfirmationToken,
  insertEmailConfirmationToken,
} from "../../db/repositories/emailConfirmationTokens";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "change-me-refresh-secret";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const CONFIRMATION_TOKEN_EXPIRY_HOURS = 24;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: number): string {
  // Include a unique jti (JWT ID) to prevent duplicate tokens
  // when multiple refresh requests occur within the same second
  const jti = crypto.randomUUID();
  return jwt.sign({ userId, jti }, REFRESH_SECRET, {
    expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d`,
  });
}

export function verifyAccessToken(token: string): { userId: number; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

export async function validateLogin(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export async function createUserWithPassword(email: string, password: string, firstname?: string) {
  const passwordHash = await hashPassword(password);
  const isFirstUser = (await countUsers()) === 0;

  const [org] = await createOrganization({
    name: `${firstname || email}'s Organization`,
  });

  const [user] = await createUser({
    email: email.toLowerCase(),
    passwordHash,
    firstName: firstname || null,
    organizationId: org.id,
    role: isFirstUser ? "admin" : "user",
  });

  return user;
}

export async function createTokens(userId: number, email: string) {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId);

  await insertRefreshToken({
    userId,
    token: refreshToken,
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(token: string) {
  const stored = await findRefreshToken(token);
  if (!stored) return null;

  const user = await getUserById(stored.userId);
  if (!user) return null;

  // Rotate: invalidate the old token and issue a new pair
  await deleteRefreshToken(token);
  const { accessToken, refreshToken } = await createTokens(user.id, user.email);

  return { accessToken, refreshToken, user };
}

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

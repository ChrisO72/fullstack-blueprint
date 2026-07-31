import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  deleteRefreshTokenByHash,
  findRefreshTokenByHash,
  insertRefreshToken,
} from "~/db/repositories/refreshTokens";
import { getUserById } from "~/db/repositories/users";
import { env } from "~/env.server";

const JWT_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;

// Token lifetimes in seconds. These are the single source of truth for both
// JWT `expiresIn` and the cookie `maxAge` (see session.server.ts).
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_MAX_AGE,
  });
}

export function generateRefreshToken(userId: number): string {
  // Include a unique jti (JWT ID) to prevent duplicate tokens
  // when multiple refresh requests occur within the same second
  const jti = crypto.randomUUID();
  return jwt.sign({ userId, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_MAX_AGE,
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
  return new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000);
}

// Refresh tokens are stored hashed at rest so a DB leak can't be replayed
// against the auth endpoint. The raw JWT only ever lives in the user's cookie.
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createTokens(userId: number, email: string) {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId);

  await insertRefreshToken({
    userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(token: string) {
  const tokenHash = hashRefreshToken(token);
  const stored = await findRefreshTokenByHash(tokenHash);
  if (!stored) return null;

  const user = await getUserById(stored.userId);
  if (!user) return null;

  // Rotate: invalidate the old token and issue a new pair
  await deleteRefreshTokenByHash(tokenHash);
  const { accessToken, refreshToken } = await createTokens(user.id, user.email);

  return { accessToken, refreshToken, user };
}

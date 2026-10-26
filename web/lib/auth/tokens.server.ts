import crypto from "crypto";
import jwt from "jsonwebtoken";
import { rotateRefreshToken, insertRefreshToken } from "~/db/repositories/refreshTokens";
import { getUserById } from "~/db/repositories/users";
import { env } from "~/env.server";

const JWT_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.REFRESH_SECRET;

// Token lifetimes in seconds. These are the single source of truth for both
// JWT `expiresIn` and the cookie `maxAge` (see session.server.ts).
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;
export const REFRESH_TOKEN_GRACE_MS = 10_000;

export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_MAX_AGE,
  });
}

export function generateRefreshToken(
  userId: number,
  tokenId: string = crypto.randomUUID(),
  issuedAt = new Date(),
): string {
  return jwt.sign(
    { userId, jti: tokenId, iat: Math.floor(issuedAt.getTime() / 1000) },
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_MAX_AGE,
    },
  );
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

// Refresh tokens are stored hashed at rest so a DB leak can't be replayed
// against the auth endpoint. The raw JWT only ever lives in the user's cookie.
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createTokens(userId: number, email: string) {
  const accessToken = generateAccessToken(userId, email);
  const { refreshToken, record } = prepareRefreshToken(userId);
  await insertRefreshToken(record);

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(token: string) {
  const payload = verifyRefreshToken(token);
  if (!payload) return null;

  const { record } = prepareRefreshToken(payload.userId);
  const stored = await rotateRefreshToken(hashRefreshToken(token), record, REFRESH_TOKEN_GRACE_MS);
  if (!stored) return null;

  const user = await getUserById(stored.userId);
  if (!user) return null;

  if (!stored.tokenId || !stored.issuedAt) return null;
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = generateRefreshToken(user.id, stored.tokenId, stored.issuedAt);

  return { accessToken, refreshToken, user };
}

function prepareRefreshToken(userId: number) {
  const tokenId = crypto.randomUUID();
  const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
  const refreshToken = generateRefreshToken(userId, tokenId, issuedAt);
  return {
    refreshToken,
    record: {
      userId,
      tokenId,
      issuedAt,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(issuedAt.getTime() + REFRESH_TOKEN_MAX_AGE * 1000),
    },
  };
}

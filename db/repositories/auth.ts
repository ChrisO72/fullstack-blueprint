import crypto from "crypto";
import { eq, and, gt, count, desc } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens, organizations, emailConfirmationTokens } from "../schema";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "../../web/lib/auth.server";

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return user ?? null;
}

export async function createUserWithPassword(email: string, password: string, firstname?: string) {
  const passwordHash = await hashPassword(password);

  const [{ count: userCount }] = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount === 0;

  // Create a personal organization for the user
  const [org] = await db
    .insert(organizations)
    .values({
      name: `${firstname || email}'s Organization`,
    })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstname || null,
      organizationId: org.id,
      role: isFirstUser ? "admin" : "user",
    })
    .returning();

  return user;
}

export async function validateLogin(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export async function createTokens(userId: number, email: string) {
  const accessToken = generateAccessToken(userId, email);
  const refreshToken = generateRefreshToken(userId);

  await db.insert(refreshTokens).values({
    userId,
    token: refreshToken,
    expiresAt: getRefreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export async function refreshAccessToken(token: string) {
  return await db.transaction(async (tx) => {
    const [storedToken] = await tx
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())))
      .limit(1);

    if (!storedToken) return null;

    const [user] = await tx.select().from(users).where(eq(users.id, storedToken.userId)).limit(1);
    if (!user) return null;

    // Delete old refresh token
    await tx.delete(refreshTokens).where(eq(refreshTokens.token, token));

    // Create new refresh token (rotation)
    const newRefreshToken = generateRefreshToken(user.id);
    await tx.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken: generateAccessToken(user.id, user.email),
      refreshToken: newRefreshToken,
      user,
    };
  });
}

export async function deleteRefreshToken(token: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

const CONFIRMATION_TOKEN_EXPIRY_HOURS = 24;

export async function createEmailConfirmationToken(userId: number): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + CONFIRMATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await db.insert(emailConfirmationTokens).values({ userId, token, expiresAt });
  return token;
}

export async function verifyEmailConfirmationToken(token: string) {
  const [row] = await db
    .select()
    .from(emailConfirmationTokens)
    .where(
      and(
        eq(emailConfirmationTokens.token, token),
        gt(emailConfirmationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;

  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  return user ?? null;
}

export async function getLatestConfirmationTokenCreatedAt(userId: number): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: emailConfirmationTokens.createdAt })
    .from(emailConfirmationTokens)
    .where(eq(emailConfirmationTokens.userId, userId))
    .orderBy(desc(emailConfirmationTokens.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

export async function confirmUserEmail(userId: number, token: string) {
  await db.update(users).set({ emailConfirmedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(emailConfirmationTokens).where(eq(emailConfirmationTokens.token, token));
}

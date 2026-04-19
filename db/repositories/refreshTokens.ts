import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { type InsertRefreshToken, refreshTokens } from "../schema";

export async function insertRefreshToken(data: InsertRefreshToken) {
  const [row] = await db.insert(refreshTokens).values(data).returning();
  return row;
}

export async function findRefreshToken(token: string) {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function deleteRefreshToken(token: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

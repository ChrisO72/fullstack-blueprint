import { and, eq, gt, or } from "drizzle-orm";
import { db } from "../db";
import { type InsertRefreshToken, refreshTokens } from "../schema/auth";

export async function insertRefreshToken(data: InsertRefreshToken) {
  const [row] = await db.insert(refreshTokens).values(data).returning();
  return row;
}

export async function findRefreshTokenByHash(tokenHash: string) {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

type RefreshTokenReplacement = Pick<InsertRefreshToken, "userId" | "tokenHash" | "expiresAt"> & {
  tokenId: string;
  issuedAt: Date;
};

export async function rotateRefreshToken(
  tokenHash: string,
  replacement: RefreshTokenReplacement,
  gracePeriodMs: number,
) {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [stored] = await tx
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, replacement.userId),
          gt(refreshTokens.expiresAt, now),
          or(
            eq(refreshTokens.tokenHash, tokenHash),
            and(
              eq(refreshTokens.previousTokenHash, tokenHash),
              gt(refreshTokens.previousValidUntil, now),
            ),
          ),
        ),
      )
      .limit(1)
      .for("update");
    if (!stored) return null;

    const lockedAt = new Date();
    if (stored.expiresAt <= lockedAt) return null;
    if (stored.tokenHash !== tokenHash) {
      return stored.previousValidUntil && stored.previousValidUntil > lockedAt ? stored : null;
    }
    // Keep one replacement for all requests in the grace window.
    if (
      stored.tokenId &&
      stored.issuedAt &&
      stored.previousValidUntil &&
      stored.previousValidUntil > lockedAt
    ) {
      return stored;
    }

    const [rotated] = await tx
      .update(refreshTokens)
      .set({
        ...replacement,
        previousTokenHash: stored.tokenHash,
        previousValidUntil: new Date(lockedAt.getTime() + gracePeriodMs),
      })
      .where(eq(refreshTokens.id, stored.id))
      .returning();
    return rotated;
  });
}

export async function deleteRefreshTokenByHash(tokenHash: string) {
  await db
    .delete(refreshTokens)
    .where(
      or(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.previousTokenHash, tokenHash)),
    );
}

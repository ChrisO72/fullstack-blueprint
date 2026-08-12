import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  passwordResetTokens,
  refreshTokens,
  type InsertPasswordResetToken,
  users,
} from "../schema/auth";

export async function replacePasswordResetToken(data: InsertPasswordResetToken) {
  return db.transaction(async (tx) => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, data.userId));
    const [row] = await tx.insert(passwordResetTokens).values(data).returning();
    return row;
  });
}

export async function findPasswordResetToken(tokenHash: string) {
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function deletePasswordResetToken(tokenHash: string) {
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
}

export async function getLatestPasswordResetTokenCreatedAt(userId: number): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: passwordResetTokens.createdAt })
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, userId))
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

export async function consumePasswordResetToken(tokenHash: string, passwordHash: string) {
  return db.transaction(async (tx) => {
    const [token] = await tx
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });

    if (!token) return null;

    const [user] = await tx
      .update(users)
      .set({ passwordHash })
      .where(and(eq(users.id, token.userId), isNull(users.deletedAt)))
      .returning({ id: users.id });

    if (!user) return null;

    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
    return user;
  });
}

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { emailConfirmationTokens, type InsertEmailConfirmationToken, users } from "../schema/auth";

export async function replaceEmailConfirmationToken(data: InsertEmailConfirmationToken) {
  return db.transaction(async (tx) => {
    await tx.delete(emailConfirmationTokens).where(eq(emailConfirmationTokens.userId, data.userId));
    const [row] = await tx.insert(emailConfirmationTokens).values(data).returning();
    return row;
  });
}

export async function findEmailConfirmationToken(tokenHash: string) {
  const [row] = await db
    .select()
    .from(emailConfirmationTokens)
    .where(
      and(
        eq(emailConfirmationTokens.tokenHash, tokenHash),
        gt(emailConfirmationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function deleteEmailConfirmationToken(tokenHash: string) {
  await db.delete(emailConfirmationTokens).where(eq(emailConfirmationTokens.tokenHash, tokenHash));
}

export async function getLatestEmailConfirmationTokenCreatedAt(
  userId: number,
): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: emailConfirmationTokens.createdAt })
    .from(emailConfirmationTokens)
    .where(eq(emailConfirmationTokens.userId, userId))
    .orderBy(desc(emailConfirmationTokens.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}

export async function consumeEmailConfirmationToken(tokenHash: string) {
  return db.transaction(async (tx) => {
    const [token] = await tx
      .delete(emailConfirmationTokens)
      .where(
        and(
          eq(emailConfirmationTokens.tokenHash, tokenHash),
          gt(emailConfirmationTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: emailConfirmationTokens.userId });

    if (!token) return null;

    const [user] = await tx
      .update(users)
      .set({ emailConfirmedAt: new Date() })
      .where(and(eq(users.id, token.userId), isNull(users.deletedAt)))
      .returning();

    return user ?? null;
  });
}

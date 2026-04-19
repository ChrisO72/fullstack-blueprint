import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { emailConfirmationTokens, type InsertEmailConfirmationToken } from "../schema";

export async function insertEmailConfirmationToken(data: InsertEmailConfirmationToken) {
  const [row] = await db.insert(emailConfirmationTokens).values(data).returning();
  return row;
}

export async function findEmailConfirmationToken(token: string) {
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
  return row ?? null;
}

export async function deleteEmailConfirmationToken(token: string) {
  await db.delete(emailConfirmationTokens).where(eq(emailConfirmationTokens.token, token));
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

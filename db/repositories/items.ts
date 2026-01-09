import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertItem, items } from "../schema";

export async function createItem(item: InsertItem) {
  return await db.insert(items).values(item).returning();
}

export async function getItemById(id: number) {
  const result = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), isNull(items.deleted_at)));
  return result[0] || null;
}

export async function updateItem(id: number, data: Partial<InsertItem>) {
  return await db
    .update(items)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(items.id, id))
    .returning();
}

export async function softDeleteItem(id: number) {
  return await db
    .update(items)
    .set({
      deleted_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(items.id, id))
    .returning();
}

export async function listItems() {
  return await db.select().from(items).where(isNull(items.deleted_at));
}

export async function getItemsByUserId(userId: number) {
  return await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), isNull(items.deleted_at)));
}

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertSubItem, subItems } from "../schema";

export async function createSubItem(subItem: InsertSubItem) {
  return await db.insert(subItems).values(subItem).returning();
}

export async function getSubItemById(id: number) {
  const result = await db
    .select()
    .from(subItems)
    .where(and(eq(subItems.id, id), isNull(subItems.deleted_at)));
  return result[0] || null;
}

export async function updateSubItem(id: number, data: Partial<InsertSubItem>) {
  return await db
    .update(subItems)
    .set({
      ...data,
      updated_at: new Date(),
    })
    .where(eq(subItems.id, id))
    .returning();
}

export async function softDeleteSubItem(id: number) {
  return await db
    .update(subItems)
    .set({
      deleted_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(subItems.id, id))
    .returning();
}

export async function listSubItems() {
  return await db.select().from(subItems).where(isNull(subItems.deleted_at));
}

export async function getSubItemsByItemId(itemId: number) {
  return await db
    .select()
    .from(subItems)
    .where(and(eq(subItems.itemId, itemId), isNull(subItems.deleted_at)));
}

import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertItem, items } from "../schema";

export async function createItem(item: InsertItem) {
  return await db.insert(items).values(item).returning();
}

export async function getItemById(id: number) {
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), isNull(items.deletedAt)))
    .limit(1);
  return item ?? null;
}

export async function updateItem(id: number, data: Partial<InsertItem>) {
  return await db.update(items).set(data).where(eq(items.id, id)).returning();
}

export async function softDeleteItem(id: number) {
  return await db.update(items).set({ deletedAt: new Date() }).where(eq(items.id, id)).returning();
}

export async function listItems() {
  return await db.select().from(items).where(isNull(items.deletedAt));
}

export async function getItemsByOrganizationId(organizationId: number) {
  return await db
    .select()
    .from(items)
    .where(and(eq(items.organizationId, organizationId), isNull(items.deletedAt)));
}

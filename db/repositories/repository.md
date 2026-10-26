# Repository functions

Read this when adding or changing database access. Keep one focused module per table, and pass
organization scope from the authenticated caller rather than reading it from globals.

## Organization-scoped CRUD

This example follows the API in [items.ts](items.ts). Callers validate and select writable fields
before passing data. Set insert ownership from the authenticated user, and never allow browser
input to change `organizationId`, timestamps, or other protected fields.

```ts
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { type InsertItem, items } from "../schema/items";

export async function createItem(item: InsertItem) {
  return db.insert(items).values(item).returning();
}

export async function getItemById(id: number, organizationId: number) {
  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.organizationId, organizationId), isNull(items.deletedAt)))
    .limit(1);
  return item ?? null;
}

export async function updateItem(id: number, organizationId: number, data: Partial<InsertItem>) {
  return db
    .update(items)
    .set(data)
    .where(and(eq(items.id, id), eq(items.organizationId, organizationId), isNull(items.deletedAt)))
    .returning();
}

export async function softDeleteItem(id: number, organizationId: number) {
  return db
    .update(items)
    .set({ deletedAt: new Date() })
    .where(and(eq(items.id, id), eq(items.organizationId, organizationId), isNull(items.deletedAt)))
    .returning();
}

export async function listItemsByOrg(organizationId: number) {
  return db
    .select()
    .from(items)
    .where(and(eq(items.organizationId, organizationId), isNull(items.deletedAt)));
}
```

## Query rules

- Filter active records with `isNull(table.deletedAt)`, including relationship queries.
- Soft delete by setting `deletedAt`; do not hard-delete application records.
- Let the schema's `$onUpdate` maintain `updatedAt`.
- Scope domain reads, updates, and deletes by `organizationId`; set it on inserts.
- Keep functions small and add relationship helpers only as needed.

See [schema.md](../schema.md) before changing tables, timestamps, or indexes.

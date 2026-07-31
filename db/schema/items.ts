import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { timestamps } from "./shared";

export const items = pgTable(
  "items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...timestamps,
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    status: varchar({ enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    priority: integer().default(0),
  },
  // Partial indexes: only index non-deleted rows to optimize soft-delete queries
  (table) => [
    index("items_active_idx")
      .on(table.id)
      .where(sql`deleted_at IS NULL`),
    index("items_org_active_idx")
      .on(table.organizationId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export const subItems = pgTable(
  "sub_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...timestamps,
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
  },
  // Partial indexes: only index non-deleted rows to optimize soft-delete queries
  (table) => [
    index("sub_items_active_idx")
      .on(table.id)
      .where(sql`deleted_at IS NULL`),
    index("sub_items_item_active_idx")
      .on(table.itemId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type SelectItem = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;
export type SelectSubItem = typeof subItems.$inferSelect;
export type InsertSubItem = typeof subItems.$inferInsert;

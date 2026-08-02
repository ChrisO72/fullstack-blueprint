import { sql } from "drizzle-orm";
import { index, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { organizations } from "./organizations";
import { timestamps } from "./shared";

export const files = pgTable(
  "files",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ...timestamps,
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    storageKey: varchar("storage_key", { length: 512 }).notNull().unique(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 255 }).notNull(),
    expectedSize: integer("expected_size").notNull(),
    actualSize: integer("actual_size"),
    status: varchar({ enum: ["pending", "ready", "failed"] })
      .notNull()
      .default("pending"),
  },
  (table) => [
    index("files_active_idx")
      .on(table.id)
      .where(sql`deleted_at IS NULL`),
    index("files_org_active_idx")
      .on(table.organizationId)
      .where(sql`deleted_at IS NULL`),
    index("files_org_status_active_idx")
      .on(table.organizationId, table.status)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type SelectFile = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

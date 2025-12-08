import {
  boolean,
  decimal,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deleted_at: timestamp(),
};

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps,
  email: varchar({ length: 255 }).notNull().unique(),
  firstName: varchar({ length: 100 }),
  lastName: varchar({ length: 100 }),
  role: varchar({ enum: ["admin", "user", "viewer"] })
    .notNull()
    .default("user"),
  organizationId: integer()
    .notNull()
    .references(() => organizations.id),
});

export const organizations = pgTable("organizations", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps,
  name: varchar({ length: 255 }).notNull(),
  description: text(),
});

export const items = pgTable("items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps,
  userId: integer()
    .notNull()
    .references(() => users.id),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  status: varchar({ enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  priority: integer().default(0),
});

export const subItems = pgTable("sub_items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps,
  itemId: integer()
    .notNull()
    .references(() => items.id),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
});

export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type SelectOrganization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export type SelectItem = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

export type SelectSubItem = typeof subItems.$inferSelect;
export type InsertSubItem = typeof subItems.$inferInsert;

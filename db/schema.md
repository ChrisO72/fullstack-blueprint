# Database schema and migrations

Read this before changing tables or generating migrations. Commands run from the repository root;
configure and start PostgreSQL using [README.md](README.md).

## Files

- `schema/` — domain tables: auth, files, items, organizations, and settings.
- [schema/shared.ts](schema/shared.ts) — common timestamps.
- `drizzle/` — generated SQL and migration journal; never edit by hand.
- [repositories/](repositories/README.md) — application database access.

## Schema change workflow

1. Edit the relevant domain module under `schema/`.
2. Generate the migration, then apply it when running the application locally:

   ```bash
   npm run db:generate -- --name=short_change_name # Generate SQL and journal changes
   npm run db:migrate                            # Apply pending migrations to the configured database
   ```

3. Commit the schema changes and generated migration files together.

Application startup and deployment ordering are covered in [database operations](README.md).
These are developer workflow commands; agents must follow the root verification policy and leave
running services and applying migrations to the user.

## Table pattern

Use camelCase properties in TypeScript and the mapped snake_case column names in SQL.
Every domain table includes the shared timestamps and an organization foreign key. Example:

```ts
import { sql } from "drizzle-orm";
import { index, integer, pgTable, varchar } from "drizzle-orm/pg-core";
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
  },
  (table) => [
    index("items_org_active_idx")
      .on(table.organizationId)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type InsertItem = typeof items.$inferInsert;
export type SelectItem = typeof items.$inferSelect;
```

The schema's `$onUpdate` updates `updatedAt` automatically on Drizzle updates. Reads filter
`isNull(table.deletedAt)`; deletes set `deletedAt`. Domain operations take `organizationId` from
the authenticated context and scope every query. See the [repository template](repositories/repository.md)
for these operations. Partial indexes should match active-row filters on frequently queried columns.

# Database

Drizzle ORM + PostgreSQL. See the repo-root [README.md](../README.md) for stack and commands, and [repositories/README.md](repositories/README.md) for the repository function template.

## Files

- [schema.ts](schema.ts) — single source of truth for tables. Edit here.
- [db.ts](db.ts) — the configured Drizzle client. Import only inside repositories.
- [repositories/](repositories/) — one file per table, exporting CRUD + relation helpers.
- `drizzle/` — generated migrations (output of `npm run db:generate`).

## Schema change workflow

1. Edit [schema.ts](schema.ts).
2. Generate a migration:

   ```bash
   npm run db:generate -- --name=<short_change_name>
   ```

3. Apply it:

   ```bash
   npm run db:migrate
   ```

4. Commit `schema.ts` and the new migration files together.

## Best practices

### Use the standard `timestamps` spread

Every domain table should include `createdAt`, `updatedAt`, and `deletedAt` via the shared spread in [schema.ts](schema.ts):

```ts
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp("deleted_at"),
};

export const items = pgTable("items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps,
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar({ length: 255 }).notNull(),
});
```

### Soft delete only

Reads must filter `isNull(<table>.deleted_at)`. To delete, set `deleted_at: new Date()` — never `db.delete()`. Bump `updated_at` on every update. Full template in [repositories/README.md](repositories/README.md).

### Multi-org scoping

Domain tables carry `organization_id`. Every read/write must filter or set it. Pass `organizationId` as a parameter rather than reading it from globals:

```ts
export async function listItemsByOrg(organizationId: number) {
  return db
    .select()
    .from(items)
    .where(and(eq(items.organizationId, organizationId), isNull(items.deletedAt)));
}
```

### Partial indexes for soft-deleted rows

Add `WHERE deleted_at IS NULL` partial indexes on hot lookup columns so soft-delete filters stay cheap:

```ts
export const items = pgTable(
  "items",
  {
    /* columns */
  },
  (table) => [
    index("items_org_active_idx")
      .on(table.organizationId)
      .where(sql`deleted_at IS NULL`),
  ],
);
```

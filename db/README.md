# Database

Drizzle ORM + PostgreSQL. See the repo-root [README.md](../README.md) for stack and commands, and [repositories/README.md](repositories/README.md) for the repository function template.

## Containers and configuration

`Dockerfile` extends the PostgreSQL 16 Alpine image and retains its standard entrypoint.
Configure it with `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`; persist data at
`/var/lib/postgresql/data`. Root Compose supplies local defaults and a named volume.

`Dockerfile.migrate` packages the compiled Node migration runner and SQL files. Build with the
repository root as context. Its only required application variable is `DATABASE_URL`; it needs
neither web secrets nor Redis, mail, or Sentry settings. `npm run build:db` writes `build/db/`.
Drizzle generation and studio also use database-only environment validation.

Compose waits for healthy PostgreSQL, runs the migration container, and starts web/worker only if
it exits successfully. In a deployment, run this image once before starting the new application
version. PostgreSQL restarts do not run application migrations. Never put application migrations
in the PostgreSQL first-initialization directory: existing databases need later migrations too.

## Files

- `schema/` — table definitions grouped by domain (`auth.ts`, `files.ts`, `items.ts`, `organizations.ts`, `settings.ts`).
- [schema/shared.ts](schema/shared.ts) — shared column definitions such as standard timestamps.
- [db.ts](db.ts) — the configured Drizzle client. Import only inside repositories.
- [repositories/](repositories/) — one file per table, exporting CRUD + relation helpers.
- `drizzle/` — generated migrations (output of `npm run db:generate`).

## Schema change workflow

1. Edit the relevant domain module under `schema/`.
2. Generate a migration:

   ```bash
   npm run db:generate -- --name=<short_change_name>
   ```

3. Apply it:

   ```bash
   npm run db:migrate
   ```

4. Commit the changed schema module and the new migration files together.

## Best practices

### Use the standard `timestamps` spread

Every domain table should include `createdAt`, `updatedAt`, and `deletedAt` via the shared spread in [schema/shared.ts](schema/shared.ts):

```ts
import { timestamps } from "./shared";

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
export const items = pgTable("items", {/* columns */}, (table) => [
  index("items_org_active_idx")
    .on(table.organizationId)
    .where(sql`deleted_at IS NULL`),
]);
```

## Migration startup failures

`npm run db:migrate` uses Drizzle’s programmatic PostgreSQL migrator in [migrate.ts](migrate.ts).
It applies the same generated journal and only unapplied migrations, closes its connection pool,
and exits nonzero on failure. Error causes are printed without the CLI progress spinner, SQL
parameters, or connection URLs, so Compose logs retain the reason an initialization service failed.

A PostgreSQL `No space left on device` error requires freeing Docker disk space or increasing its
disk allocation. Preserve the `pgdata` volume; `docker:wipe` is not a recovery command. After the
storage issue is resolved, `make down` followed by `make dev` recreates containers and their network
attachments while retaining named volumes.

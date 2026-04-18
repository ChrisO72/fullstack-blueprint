# db/AGENTS.md

Drizzle ORM + PostgreSQL. See [db/repositories/README.md](repositories/README.md) for the repository pattern with code examples, and the repo-root [AGENTS.md](../AGENTS.md) for stack and commands.

## Files

- [db/schema.ts](schema.ts) — single source of truth for tables. Edit here.
- [db/repositories/](repositories/) — one file per table, exporting CRUD + relation helpers.
- [db/db.ts](db.ts) — the configured Drizzle client. Import only inside repositories.
- `db/drizzle/` — **generated migrations. Never edit by hand.**

## Schema change workflow

1. Edit [db/schema.ts](schema.ts).
2. Run `npm run db:generate -- --name=<short_change_name>` to produce a migration.
3. Ask before running `npm run db:migrate` against the local DB.
4. Commit `schema.ts` and the generated migration files together.

## Conventions (enforced in every repository function)

- **Soft delete only.** Reads must filter `isNull(<table>.deleted_at)`. To delete, set `deleted_at: new Date()` — never `db.delete()`.
- **Bump `updated_at`** on every update (`updated_at: new Date()`).
- **Multi-org scoping.** Domain tables (e.g. `items`, `sub_items`) carry `organization_id`. Every read/write must filter or set it; pass `organizationId` as a parameter rather than reading it from globals.
- Use the standard `timestamps` spread from [db/schema.ts](schema.ts) (`createdAt`, `updatedAt`, `deletedAt`) on new tables.
- Add partial indexes `WHERE deleted_at IS NULL` on hot lookup columns (see the `items` table for the pattern).

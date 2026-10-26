# Database instructions

This area owns PostgreSQL configuration, schemas, migrations, and repository functions.
Use [README.md](README.md) for database operations.

- Never edit `drizzle/` by hand; generate migrations with `npm run db:generate`.
- Keep schema changes and their generated migrations together.
- Application database access belongs in `repositories/`.

Read [schema.md](schema.md) before changing schemas, indexes, or migrations.
Before editing repository functions, read [repositories/AGENTS.md](repositories/AGENTS.md) and
[repositories/repository.md](repositories/repository.md).

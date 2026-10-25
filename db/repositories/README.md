# Repositories

Application database access lives here, with one module per table. Routes and worker handlers
call repository functions instead of importing the database client.

For connection setup and migrations, see [database operations](../README.md).

## Development guides

- [Repository functions](repository.md) — CRUD examples, organization scoping, and soft deletes.
- [Schema changes](../schema.md) — adding tables and generating migrations.

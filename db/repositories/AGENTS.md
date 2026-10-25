# Repository instructions

This directory owns application database access, with one focused module per table.

- Scope domain operations by the caller's authenticated organization.
- Filter soft-deleted records from reads and use soft deletes for removal.
- Let schema `$onUpdate` maintain `updatedAt`.

Read [repository.md](repository.md) before adding or changing queries.
Read [schema.md](../schema.md) when the change also affects tables or indexes.

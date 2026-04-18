# AGENTS.md

Guidance for AI coding agents working in this repo. See [README.md](README.md) for human setup. Nested AGENTS.md files in [web/](web/AGENTS.md), [worker/](worker/AGENTS.md), and [db/](db/AGENTS.md) take precedence for area-specific rules.

## Stack

React Router 7 (SSR) · Tailwind v4 + Catalyst-style UI kit · Drizzle ORM + PostgreSQL · BullMQ + Redis · JWT auth with refresh tokens + multi-org. TypeScript strict, ESM, Node 20+.

## Commands

- `npm run dev` — web + worker concurrently (web on `:5173`)
- `npm run check` — **required pre-finish gate**: `react-router typegen && tsc && eslint . && prettier --check .`
- `npm run typecheck` — types only (faster inner loop)
- `npm run db:generate -- --name=<change>` — generate a migration after editing `db/schema.ts`
- `npm run db:migrate` — apply migrations (ask first)
- `npm run docker:up` / `docker:down` — local Postgres + Redis

## Layout

- [web/](web/) — React Router 7 SSR app (routes, components, server-only helpers)
- [worker/](worker/) — BullMQ job processor + cron scheduler
- [db/](db/) — Drizzle schema, generated migrations, repository functions

## Conventions

- Path aliases (see [tsconfig.json](tsconfig.json)): `~/*` → `web/*`, `~/db/*` → `db/*`
- Server-only modules end in `.server.ts` and must never be imported from client components
- Generated/build dirs are off-limits: `.react-router/`, `build/`, `db/drizzle/` (migrations are generated)
- Run formatters/linters via `npm run check` rather than invoking `prettier`/`eslint` ad hoc
- Prefer editing existing files over creating new ones; match the surrounding style

## Safety

- Allowed: read files, edit code, run `npm run check`, `npm run typecheck`, `npm run dev`
- Ask first: `npm install` (any dependency change), `db:generate`, `db:migrate`, `docker:wipe`, `git push`
- Never: commit secrets or `.env`, hardcode credentials, edit files under `db/drizzle/` by hand, use `any` to silence TypeScript

## Done means

- `npm run check` passes
- No new `any`, no `@ts-ignore`, no `eslint-disable` without justification
- New DB access goes through a function in [db/repositories/](db/repositories/), not raw `db` calls from routes
- Schema changes are accompanied by a generated migration

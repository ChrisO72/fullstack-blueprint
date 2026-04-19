# Fullstack Blueprint

A production-ready template for full-stack Node + React applications.

**Stack:** React Router 7 (SSR) · Tailwind + Catalyst UI · Drizzle ORM + PostgreSQL · BullMQ + Redis · JWT auth with refresh tokens + multi-org

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + Redis)

## Local Development

### First time setup

```bash
npm install
cp .env.example .env          # configure env vars
npm run docker:up              # start Postgres + Redis containers
npm run db:migrate             # apply database migrations
```

Postgres is exposed on `:55432`, Redis on `:6379`.

### Start dev server

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### Database & Queue

```bash
npm run docker:up              # start
npm run docker:down            # stop
npm run docker:wipe            # stop + delete volumes

npm run db:generate -- --name=migration_name   # create a new migration
npm run db:migrate                             # apply migrations
npm run db:studio                              # open Drizzle Studio browser
```

## Production

```bash
npm run build                  # build web + worker
npm run start                  # serve both (or run separately below)
npm run start:web              # web server only
npm run start:worker           # background worker only
```

Set `DATABASE_URL` and `REDIS_URL` to your managed instances. See `.env.example` for all required variables.

## Checks

```bash
npm run check                  # typecheck + lint + format (required pre-commit gate)
```

`npm run check` runs `react-router typegen && tsc && eslint . && prettier --check .`. It must pass before any change is considered done.

## Project layout

- [web/](web/) — React Router 7 SSR app. See [web/README.md](web/README.md) for routing, server boundary, validation, data access, and UI patterns.
- [worker/](worker/) — BullMQ jobs + node-cron scheduler. See [worker/README.md](worker/README.md) for the job/scheduler templates.
- [db/](db/) — Drizzle schema, generated migrations, repository functions. See [db/README.md](db/README.md) for the schema workflow and [db/repositories/README.md](db/repositories/README.md) for the repository template.

## Conventions

- **Path aliases** (see [tsconfig.json](tsconfig.json)): `~/*` → `web/*`, `~/db/*` → `db/*`.
- **Server-only modules end in `.server.ts`** and must never be imported from client components (e.g. [web/lib/auth.server.ts](web/lib/auth.server.ts), [web/lib/session.server.ts](web/lib/session.server.ts)).
- **Generated dirs**: `.react-router/`, `build/`, and `db/drizzle/` are generated — `db/drizzle/` by `npm run db:generate`.
- **Secrets**: `.env` is git-ignored; use `.env.example` for the schema.
- **TypeScript strict** is on across the repo.
- **DB access goes through repositories** in [db/repositories/](db/repositories/), one file per table.

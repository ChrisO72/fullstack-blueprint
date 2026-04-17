# Fullstack Blueprint

A production-ready template for full-stack Node + React applications.

**Stack:** React Router 7 (SSR) · Tailwind + Catalyst UI · Drizzle ORM + PostgreSQL · BullMQ + Redis · JWT auth with refresh tokens + multi-org

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + Redis)

## Local Development

```bash
npm install
cp .env.example .env          # configure env vars
npm run docker:up              # start Postgres + Redis containers
npm run db:migrate             # apply database migrations
npm run dev                    # start web server + worker
```

The app runs at `http://localhost:5173`. Postgres is exposed on `:55432`, Redis on `:6379`.

## Database

```bash
npm run db:generate -- --name=migration_name   # create a new migration
npm run db:migrate                             # apply migrations
npm run db:studio                              # open Drizzle Studio browser
```

## Docker (local services)

```bash
npm run docker:up              # start
npm run docker:down            # stop
npm run docker:wipe            # stop + delete volumes
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
npm run check                  # typecheck + lint + format
```

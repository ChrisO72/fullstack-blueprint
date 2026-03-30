# Fullstack Blueprint

A template for building full-stack Node + React applications.

## Tech stack

- React Router 7 (SSR) + Tailwind + Catalyst UI
- Drizzle ORM + PostgreSQL
- BullMQ job queues + Redis
- JWT auth with refresh tokens + multi-org support

## Prerequisites

- Node.js 20+
- Docker (for local Postgres + Redis)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your keys
docker compose up -d    # local Postgres + Redis
npm run db:migrate # apply migrations
npm run dev
```

### Environment variables

```bash
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
REDIS_URL=redis://localhost:6379
HIKER_API_KEY=your-hiker-api-key
GOOGLE_API_KEY=your-google-api-key
```

### Database

```bash
npx drizzle-kit generate --name=migration_name   # generate migration
npx drizzle-kit migrate                          # apply migrations
npx drizzle-kit studio                           # open database browser
```

Local Postgres runs on `127.0.0.1:55432` and Redis on `127.0.0.1:6379` via Docker Compose.

```bash
docker compose down      # stop
docker compose down -v   # stop and wipe data
```

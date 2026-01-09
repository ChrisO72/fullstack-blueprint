# Fullstack Blueprint

A template for building full-stack Node + React applications

## Comes with:

- React Router 7 SSR web app
- Drizzle ORM + PostgreSQL
- BullMQ job queues + scheduler (Redis)
- JWT auth with refresh tokens
- Multi-org user system
- Catalyst UI Kit

## Setup

```bash
# Environment variables

# Auth
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Redis
REDIS_URL=redis://default:password@host:port

# API Keys
HIKER_API_KEY=your-hiker-api-key
GOOGLE_API_KEY=your-google-api-key
```

### Database

```bash
npx drizzle-kit generate --name=migration_name   # generate migration
npx drizzle-kit migrate                          # apply migrations
npx drizzle-kit studio                           # open database browser
```

### Development

```bash
npm install
npm run dev          # web only
npm run worker       # worker only
npm run dev:all      # web + worker
```

### Production

```bash
npm install
npm run build
npm run start         # web server
npm run worker        # background worker (separate process)
```

#### Render Deployment

**Web Service:**

- Build: `npm install && npm run build`
- Start: `npm run start`

**Background Worker** (separate service):

- Build: `npm install`
- Start: `npm run worker`

# Fullstack Blueprint

A template for building full-stack Node + React applications

## Setup

```bash
# Environment variables

# Auth
AUTH_PASSWORD=your-password
JWT_SECRET=your-secret-key

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

## Features

- Server-side rendering
- Hot Module Replacement (HMR)
- Data loading and mutations
- Background jobs (BullMQ + node-cron)
- TypeScript by default
- TailwindCSS for styling
- [React Router docs](https://reactrouter.com/)

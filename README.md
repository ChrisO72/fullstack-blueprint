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

### Development

```bash
npm install
npm run dev          # web only
npm run dev:all      # web + worker
```

### Database

```bash
npx drizzle-kit generate --name=migration_name   # generate migration
npx drizzle-kit migrate                          # apply migrations
npx drizzle-kit studio                           # open database browser
```

### Worker

```bash
npm run worker        # standalone
npm run dev:all       # with web server
```

### Production

```bash
npm install
npm run build
```

## Features

- Server-side rendering
- Hot Module Replacement (HMR)
- Data loading and mutations
- Background jobs (BullMQ + node-cron)
- TypeScript by default
- TailwindCSS for styling
- [React Router docs](https://reactrouter.com/)

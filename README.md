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

# API Keys
HIKER_API_KEY=your-hiker-api-key
GOOGLE_API_KEY=your-google-api-key
```

### Development

```bash
npm install
npm run dev
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
- TypeScript by default
- TailwindCSS for styling
- [React Router docs](https://reactrouter.com/)

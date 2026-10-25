# Web

React Router SSR application. All commands run from the repository root.

## Configuration

Requires Node 24+, Docker, and Compose 2.32.2+ for the workflows below.

```bash
npm ci                       # Install dependencies and host tools
cp .env.example .env         # First setup only; preserve an existing .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" # Run once per secret
```

Set these in the root `.env`; replace each secret placeholder with a different generated value:

```dotenv
DATABASE_URL=postgresql://blueprint-user:blueprint-password@127.0.0.1:55432/blueprint # Host database
REDIS_URL=redis://localhost:6379       # Host queue and rate-limit store
APP_URL=http://localhost:5173         # Public web origin
JWT_SECRET=                          # Required: random value, at least 32 characters
REFRESH_SECRET=                      # Required: different random value, at least 32 characters
RATE_LIMIT_KEY_SECRET=               # Required: different random value, at least 32 characters
```

Compose supplies internal database and Redis addresses. Startup commands set `NODE_ENV`.
Optional integrations: [mail](../mail/README.md#configuration), [storage](../storage/README.md#configuration),
and [telemetry](../telemetry/README.md#configuration). Mail enables account confirmation and password resets.

## Run locally

### Docker

```bash
docker compose up --build --watch web # Web + infrastructure and migrations; no worker
# In another terminal:
docker compose stop web              # Stop only web; leave infrastructure running
# After leaving the foreground command:
npm run docker:down                  # Remove the application containers; retain volumes
```

Open <http://localhost:5173>. Compose Watch provides HMR and restarts telemetry, runtime, and
startup changes. Dependency and build-file changes rebuild the image; restart after changing
`.env`, Compose configuration, or migrations. Optional hosted Sentry reporting uses the configured DSNs.
Background jobs wait until a [worker](../worker/README.md) runs.

### Host

```bash
npm run docker:up             # Wait for database, Redis, and SeaweedFS with its private bucket
npm run db:migrate            # Apply migrations
npm run dev:web               # Start web at http://localhost:5173; Ctrl+C stops it
npm run docker:down           # After stopping web: remove app containers, retain data
```

Run either Docker web or host web to avoid a port collision. Host commands read root `.env`;
the same hosted [Sentry configuration](../telemetry/README.md#configuration) works in both workflows.

## Production

[Dockerfile](Dockerfile) owns `development`, `build`, and `production` targets. Use the repository
root as build context. Production runs as the non-root Node user, with telemetry preloaded.
Builds require no application secrets, running infrastructure, or Sentry credentials.

```bash
export SENTRY_RELEASE=blueprint@your-release # Use the same identifier for web and worker
docker build --target production --build-arg SENTRY_RELEASE -f web/Dockerfile -t blueprint-web .
```

Provision PostgreSQL and Redis, then run [database migrations](../db/README.md#production) before
starting this version. Export the required configuration above with production values: `APP_URL`
is the public origin, and database/Redis addresses must be reachable from the container.
`docker run -e NAME` reads exported shell variables, not the root `.env` file.

```bash
docker run -d --init --stop-timeout 30 -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL -e REDIS_URL -e APP_URL \
  -e JWT_SECRET -e REFRESH_SECRET -e RATE_LIMIT_KEY_SECRET blueprint-web
```

Add `-e NAME` for optional integration settings when enabled. Web and worker must share the same
database and queues. The production image listens on port 3000; hosting is supplied by the adopting project.

```bash
npm run build:web             # Host build into build/web/
npm run start:web             # Start the host production build
```

Run production web as a supervised process. See [releases](../telemetry/sentry/releases.md) for source-map uploads.

## Development guides

- [Routes and forms](routes.md) — adding routes, loaders, actions, and validation.
- [Authentication](auth.md) — sessions, authorization, and rate limits.
- [UI](ui.md) — components, styling, and icons.
- [File uploads](../storage/uploads.md) — changing the private-file flow.
- [Instrumentation](../telemetry/instrumentation.md) — tracing, error capture, and shutdown.

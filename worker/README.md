# Worker

Background jobs with BullMQ and node-cron. No HTTP port is exposed.
All commands run from the repository root.

## Configuration

Requires Node 24+, Docker, and Compose 2.32.2+ for the workflows below.

```bash
npm ci                       # Install dependencies and host tools
cp .env.example .env         # First setup only; preserve an existing .env
```

Required by the worker and its jobs, in root `.env`:

```dotenv
DATABASE_URL=postgresql://blueprint-user:blueprint-password@127.0.0.1:55432/blueprint # Host database
REDIS_URL=redis://localhost:6379       # Host queue store
APP_URL=http://localhost:5173         # Web origin for email links
```

Web authentication secrets are not required. Compose supplies internal database and Redis
addresses. Optional integrations: [mail](../mail/README.md#configuration),
[storage](../storage/README.md#configuration), and [telemetry](../telemetry/README.md#configuration).

## Run locally

### Docker

```bash
docker compose up --build --watch worker # Worker + infrastructure and migrations; no web
# In another terminal:
docker compose stop worker              # Stop only worker; leave infrastructure running
# After leaving the foreground command:
npm run docker:down                     # Remove application containers; retain volumes
```

Compose Watch restarts the worker on source changes and rebuilds on dependency/build-file changes.
Restart after editing `.env`, Compose configuration, or migrations. Optional hosted Sentry reporting
uses the configured DSN.

### Host

```bash
npm run docker:up             # Start database, Redis, MinIO, and bucket initialization
npm run db:migrate            # Apply migrations
npm run dev:worker            # Start the worker; Ctrl+C stops it
npm run docker:down           # After stopping worker: remove app containers, retain data
```

Use one worker workflow at a time to avoid duplicate workers and schedules. Host commands read
root `.env`; the same hosted [Sentry configuration](../telemetry/README.md#configuration) works in both workflows.

## Production

[Dockerfile](Dockerfile) owns `development`, `build`, and `production` targets. Build from the
repository root. Production runs as the non-root Node user, with telemetry preloaded.
Builds require no application secrets, running infrastructure, or Sentry credentials.

```bash
export SENTRY_RELEASE=blueprint@your-release # Match the web image's release identifier
docker build --target production --build-arg SENTRY_RELEASE -f worker/Dockerfile -t blueprint-worker .
```

Provision PostgreSQL and Redis and apply [migrations](../db/README.md#production) first. Export the
required configuration above with production values. Web and worker must use the same database
and queues, reachable from their containers; `APP_URL` is the public web origin.
`docker run -e NAME` reads exported shell variables, not root `.env`.

```bash
docker run -d --init --stop-timeout 30 \
  -e DATABASE_URL -e REDIS_URL -e APP_URL blueprint-worker
```

Add `-e NAME` for enabled mail, storage, and telemetry settings. Hosting is supplied by the adopting project.

```bash
npm run build:worker          # Host build into build/worker/
npm run start:worker          # Start the host production build
```

Run production workers as supervised processes. See [releases](../telemetry/sentry/releases.md) for source-map uploads.

## Development guides

- [Jobs and schedules](jobs.md) — adding producers, handlers, retries, and schedules.
- [Email templates](../mail/templates.md) — connecting email delivery.
- [File uploads](../storage/uploads.md) — implementing file jobs.
- [Instrumentation](../telemetry/instrumentation.md) — queue tracing, errors, and shutdown.

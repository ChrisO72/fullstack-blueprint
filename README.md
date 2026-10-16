# Web App Blueprint

A battle tested template for a complete web application.
Each part of the app has it's own dedicated README file for more info.

Cool stuff included: [TypeScript](https://www.typescriptlang.org/) | [React](https://react.dev/) | [React Router](https://reactrouter.com/) | [PostgreSQL](https://www.postgresql.org/) | [Redis](https://redis.io/) | [Vite](https://vite.dev/) | [Tailwind CSS](https://tailwindcss.com/) | [Drizzle ORM](https://orm.drizzle.team/) | [BullMQ](https://bullmq.io/) | [Headless UI](https://headlessui.com/) | [Motion](https://motion.dev/) | [Zod](https://zod.dev/) | [Heroicons](https://heroicons.com/) | [Lettermint](https://lettermint.co/)

<pre>
├── web/                 # A fullstack React Router app, UI + API
│   ├── <a href="web/README.md">README.md</a>
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── routes/
├── worker/              # Background jobs and scheduled tasks
│   ├── <a href="worker/README.md">README.md</a>
│   ├── jobs/
│   └── schedules/
├── db/                  # PostgreSQL database with Drizzle ORM
│   ├── <a href="db/README.md">README.md</a>
│   ├── schema/
│   ├── repositories/
│   └── drizzle/
├── mail/                # Email sending and templates
│   └── <a href="mail/README.md">README.md</a>
├── storage/             # S3 file storage
│   └── <a href="storage/README.md">README.md</a>
├── observability/       # OpenTelemetry logs, metrics and traces
│   └── <a href="observability/README.md">README.md</a>
└── test/                # Automated tests
</pre>

## Local Development

### Container development

Requires Docker Compose **2.32.0+** with Watch support. Configure `.env` before starting:

```bash
cp .env.example .env          # configure secrets and optional mail credentials
make dev
```

This builds the Node 24 development image and starts Postgres, Redis, MinIO, bucket initialization,
database migrations, the OpenTelemetry Collector, Loki, Prometheus, Tempo, Grafana, web, and worker.
Migrations and bucket initialization must succeed before either application starts. Existing database,
Redis, and file volumes are preserved.

- App: <http://localhost:5173>
- Grafana: <http://localhost:3000> (`admin` / `admin` by default; configurable in `.env`)
- MinIO console: <http://localhost:9001> (S3 credentials from `.env`)
- Postgres: `127.0.0.1:55432`; Redis: `127.0.0.1:6379`; S3: `127.0.0.1:9000`

Only these ports are published, on loopback. Collector, Loki, Prometheus, and Tempo stay on the
Compose network. Open Grafana Explore to query them; see [observability/README.md](observability/README.md).

Compose Watch synchronizes source for web HMR and restarts the worker on source changes. Changes in
`observability/` restart both app processes so the SDK is initialized once per process. Dependency
manifest changes rebuild both app images. Host dependencies, secrets, Git, and generated output are
excluded from image copies and synchronization. After changing `.env`, Compose configuration,
backend configuration, or migrations, stop and run `make dev` again. Migration generation still
uses the host command below; migration files are committed normally.

```bash
make down                     # stop the stack; keep all data volumes
```

### Host npm workflow

Node 24+ is required. Run this instead of the container app pair:

```bash
npm ci
npm run docker:up             # Postgres, Redis, MinIO and bucket initialization only
npm run db:migrate
npm run dev                   # host web + worker; OpenTelemetry console logs by default
```

Stop the container app pair first to free the web port and avoid a second worker. Without an OTLP
endpoint the host workflow disables remote traces/metrics. Do not point host processes at the
Compose-only `otelcol` hostname.

```bash
npm run db:generate -- --name=migration_name
npm run db:migrate
npm run db:studio
npm run docker:down           # stop all Compose services, keeping volumes
npm run docker:wipe           # deliberately delete ALL Compose data volumes
```

## Production

```bash
npm run build                  # build web + worker
npm run start:web              # web server only
npm run start:worker           # background worker only
npm run start                  # run both via concurrently (single-box / smoke test)
```

For real deployments, run `start:web` and `start:worker` as separate processes under a supervisor (Docker, Kubernetes etc.) so each gets its own logs, restart policy, and scaling. `npm start` uses `concurrently --kill-others-on-fail`, so a crash in either process tears the other down — useful for local prod-like runs, but no substitute for a supervisor.

Set `DATABASE_URL`, `REDIS_URL`, and the `S3_*` variables to your managed services. AWS deployments
can omit the S3 endpoint and static credentials to use the regional endpoint and IAM role. See
[`.env.example`](.env.example) and [storage/README.md](storage/README.md).

## Observability

Server logs, request/job metrics, and distributed traces use OpenTelemetry. The Collector sends logs
to Loki, cumulative metrics to Prometheus, and traces to Tempo. Grafana provisions all three data
sources and links logs to traces in both directions. See [observability/README.md](observability/README.md)
for signal flow, logging patterns, retention, and Explore queries.

## Checks

```bash
npm test                       # critical auth and organization-boundary tests
npm run check                  # format + typecheck + lint + tests (required pre-commit gate)
```

`npm run check` formats the repository, then runs the `typecheck`, `lint`, and `test` scripts in
sequence. It must pass before any change is considered done.

Tests automatically start the local Postgres service and use a separate `blueprint_test` database
inside the same container. The test schema is reset and migrated on every run; the development
database, Redis, and S3 are untouched. Postgres remains running after the tests so an existing
development session is not interrupted.

### Continuous integration

A GitHub Actions workflow runs on every pull request and verifies changes with the typecheck, lint,
formatting, and test commands similar to `npm run check` but without writing during the format check.

## Conventions

- **Path aliases** (see [tsconfig.json](tsconfig.json)): `~/*` → `web/*`, `~/db/*` → `db/*`, `~/mail/*` → `mail/*`, `~/observability/*` → `observability/*`, `~/storage/*` → `storage/*`, `~/worker/*` → `worker/*`, `~/env.server` → [env.server.ts](env.server.ts). Use these for any cross-package or multi-level import; single-parent relative paths (`./foo`, `../foo`) are fine for siblings inside the same package. ESLint's `no-restricted-imports` blocks anything starting with `../../` to keep this consistent.
- **Server-only modules end in `.server.ts`** and must never be imported from client components (e.g. [web/lib/auth/tokens.server.ts](web/lib/auth/tokens.server.ts), [web/lib/session.server.ts](web/lib/session.server.ts)).
- **Generated dirs**: `.react-router/`, `build/`, and `db/drizzle/` are generated — `db/drizzle/` by `npm run db:generate`.
- **Secrets**: `.env` is git-ignored; use `.env.example` for the schema. All env vars are validated at boot in [env.server.ts](env.server.ts)
- **TypeScript strict** is on across the repo.
- **DB access goes through repositories** in [db/repositories/](db/repositories/), one file per table.

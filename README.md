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
├── telemetry/           # Sentry SDK integration and local hosting
│   ├── sentry/          # Provider stack, installation, CLI, and artifact uploads
│   └── <a href="telemetry/README.md">README.md</a>
├── runtime/             # Shared resource shutdown
└── test/                # Automated tests
</pre>

## Local development

Requires Node 24+, Git, Docker, and Docker Compose **2.32.2+**. From a fresh checkout:

```bash
npm ci
cp .env.example .env          # configure secrets; keep this file private
make telemetry-setup         # install Sentry; finish telemetry/README.md setup
make dev                     # telemetry, then application Compose Watch
```

`make dev` starts two Compose projects. The application project contains web, worker,
PostgreSQL, Redis, MinIO, database migrations, and bucket initialization. The separate upstream
Sentry project lives under `telemetry/sentry/`. Migrations and bucket initialization must succeed
before web and worker start. `make down` stops both projects and retains their volumes.

| Service             | Local address                                     |
| ------------------- | ------------------------------------------------- |
| Web                 | <http://localhost:5173>                           |
| Sentry              | <http://localhost:9090>                           |
| MinIO API / console | <http://localhost:9000> / <http://localhost:9001> |
| PostgreSQL          | `127.0.0.1:55432`                                 |
| Redis               | `127.0.0.1:6379`                                  |

Published ports bind to loopback. Only the Sentry ingress network connects the two projects;
Sentry's databases stay private.

Compose Watch synchronizes web source for HMR and restarts the worker on source changes.
Telemetry and shared runtime changes restart the application processes. Dependency manifest,
service Dockerfile, and service build-file changes rebuild the affected image. Installed Sentry
sources, secrets, host dependencies, Git, and generated artifacts are excluded from synchronization.
After editing environment values, Compose configuration, or migrations, stop and start again.

### Individual services and host development

The base Compose file works without a Sentry installation or its network. Leave DSNs empty when
using it without telemetry. Select a service and Compose starts its declared dependencies:

```bash
docker compose up --build --watch web
docker compose up --build --watch worker
```

These commands do not start the other application process. Web can enqueue jobs while the worker
is stopped; delivery and background processing resume when a worker runs.

To run application processes directly on the host:

```bash
npm run docker:up             # database, Redis, storage, bucket initialization
npm run db:migrate
make telemetry-up            # optional, after telemetry setup
npm run dev                  # web + worker; or dev:web / dev:worker individually
```

Run either the container application processes or the host processes, avoiding a port collision
and duplicate workers. Host npm commands read root `.env`; existing process variables take precedence.

```bash
npm run db:generate -- --name=migration_name
npm run db:studio
npm run docker:down           # application project only; retain volumes
npm run docker:wipe           # deliberately delete application data; preserves Sentry
```

### Configuration ownership

Root `.env` is the single local configuration file; `.env.example` documents fresh-start values.
Compose explicitly selects variables for each service instead of passing the complete file.
Each component validates its own configuration in its `env.server.ts` and `config.ts` modules.
Database tools need only `DATABASE_URL`; worker modules do not require web authentication secrets.
Agent and source-map upload tokens are available only to their host tooling. Sentry's internal
configuration and generated secrets remain under `telemetry/sentry/.local/`.

Mail and storage are shared integrations, not additional application processes. See the component
READMEs for required and optional environment variables. Standalone deployments supply those
variables through their deployment environment; no additional per-service dotenv files are needed.

## Production images

Web and worker each own a Dockerfile with `development`, `build`, and `production` targets.
Use the repository root as the build context. Production images include compiled code and production
dependencies, run as the non-root Node user, and start Node directly with telemetry preloaded.

Build both images with the **same release identifier**:

```bash
export SENTRY_RELEASE=blueprint@your-release
# Run these from the repository root.
docker build --target production --build-arg SENTRY_RELEASE -f web/Dockerfile -t blueprint-web .
docker build --target production --build-arg SENTRY_RELEASE -f worker/Dockerfile -t blueprint-worker .
docker build -f db/Dockerfile.migrate -t blueprint-migrate .
```

Builds need no application secrets, running infrastructure, or Sentry credentials. Production
hosting and deployment pipelines are supplied by the adopting project.

Provision PostgreSQL and Redis first, plus S3 and mail if enabled. Export the configuration listed
in the component READMEs, with addresses reachable from the containers. For example, these commands
use the already-exported values and run each image independently:

```bash
# Run once per deployment, before starting the new application version.
docker run --rm --init -e DATABASE_URL blueprint-migrate

docker run -d --init --stop-timeout 30 -p 127.0.0.1:3000:3000 \
  -e DATABASE_URL -e REDIS_URL -e APP_URL \
  -e JWT_SECRET -e REFRESH_SECRET -e RATE_LIMIT_KEY_SECRET blueprint-web

docker run -d --init --stop-timeout 30 \
  -e DATABASE_URL -e REDIS_URL -e APP_URL blueprint-worker
```

Add optional mail, storage, and Sentry variables when enabling those integrations. Web serves port
3000 in production; `APP_URL` must be its public origin. Database and storage addresses must not use
container-local `localhost` to reach another service. Web and worker need access to the same queues
and application database. PostgreSQL restarts do not trigger application migrations.

The host build/start interface is also available:

```bash
npm run build                # web + worker, one release identifier
npm run build:web            # independent web build
npm run build:worker         # independent worker build
npm run build:db             # migration runner and SQL files
npm run start:web
npm run start:worker
```

Outputs live in `build/web/`, `build/worker/`, and `build/db/`. Run web and worker as separate
supervised processes for deployments. `npm start` starts both via concurrently for local use.

## Observability

Browser, server, and worker errors, logs, request/job metrics, and connected traces use Sentry.
Local development includes fully sampled traces and masked session replay. The official Sentry
SDK owns instrumentation; application adapters add queue context and redact sensitive data.

`npm run build` produces source maps and debug IDs without contacting Sentry. Run
`npm run sentry:upload` separately to upload the built artifacts. Agents use `npm run sentry -- ...`
to inspect issues, events, logs, and traces. See [telemetry/README.md](telemetry/README.md) for setup,
data policy, source mapping, and agent commands.

## Checks

```bash
npm test                       # unit tests; no Docker or external services
npm run check                  # format + typecheck + lint + unit tests (required gate)
```

`npm run check` formats the repository, then runs the `typecheck`, `lint`, and `test` scripts in
sequence. It must pass before any change is considered done and does not require Docker.

Unit tests cover rate limiting, Sentry data policy, queue correlation, and lifecycle behavior using in-memory dependencies. Add unit tests
as `test/**/*.test.ts`.

### Continuous integration

A GitHub Actions workflow runs on every pull request and verifies changes with the typecheck, lint,
formatting, and unit test commands similar to `npm run check` but without writing during the format
check. CI does not require Docker or external services.

## Conventions

- **Path aliases** (see [tsconfig.json](tsconfig.json)): `~/*` → `web/*`, `~/db/*` → `db/*`, `~/mail/*` → `mail/*`, `~/telemetry/*` → `telemetry/*`, `~/runtime/*` → `runtime/*`, `~/storage/*` → `storage/*`, `~/worker/*` → `worker/*`, `~/env.server` → [web/env.server.ts](web/env.server.ts). Use these for any cross-package or multi-level import; single-parent relative paths (`./foo`, `../foo`) are fine for siblings inside the same package. ESLint's `no-restricted-imports` blocks anything starting with `../../` to keep this consistent.
- **Server-only modules end in `.server.ts`** and must never be imported from client components (e.g. [web/lib/auth/tokens.server.ts](web/lib/auth/tokens.server.ts), [web/lib/session.server.ts](web/lib/session.server.ts)).
- **Generated dirs**: `.react-router/`, `build/`, and `db/drizzle/` are generated — `db/drizzle/` by `npm run db:generate`.
- **Secrets**: `.env` is git-ignored; use `.env.example` for the schema. Each component validates its own environment at startup
- **TypeScript strict** is on across the repo.
- **DB access goes through repositories** in [db/repositories/](db/repositories/), one file per table.

# Web App Blueprint

A battle tested template for a complete web application.
Each part of the app has its own dedicated README file for more info.

Cool stuff included: [TypeScript](https://www.typescriptlang.org/) | [React](https://react.dev/) | [React Router](https://reactrouter.com/) | [PostgreSQL](https://www.postgresql.org/) | [Redis](https://redis.io/) | [Vite](https://vite.dev/) | [Tailwind CSS](https://tailwindcss.com/) | [Drizzle ORM](https://orm.drizzle.team/) | [BullMQ](https://bullmq.io/) | [Headless UI](https://headlessui.com/) | [Motion](https://motion.dev/) | [Zod](https://zod.dev/) | [Heroicons](https://heroicons.com/) | [Lettermint](https://lettermint.co/)


| Component                            | Purpose and setup                    |
| ------------------------------------ | ------------------------------------ |
| [Web](web/README.md)                 | React Router UI and server routes    |
| [Worker](worker/README.md)           | BullMQ jobs and scheduled tasks      |
| [Database](db/README.md)             | PostgreSQL, Drizzle, and migrations  |
| [Mail](mail/README.md)               | Lettermint email delivery            |
| [Storage](storage/README.md)         | Private S3 storage and local MinIO   |
| [Telemetry](telemetry/README.md)     | Application monitoring and debugging |
| [Sentry](telemetry/sentry/README.md) | Local monitoring stack               |

```text
├── web/                 # React Router app, UI + server routes
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── routes/
│   └── test/            # Web unit tests
├── worker/              # Background jobs and scheduled tasks
│   ├── jobs/
│   └── schedules/
├── db/                  # PostgreSQL database with Drizzle ORM
│   ├── schema/
│   ├── repositories/
│   └── drizzle/
├── mail/                # Email sending and templates
├── storage/             # Private S3 file storage
├── telemetry/           # Application monitoring and debugging
│   └── sentry/          # Provider stack, CLI, and artifact uploads
├── runtime/             # Shared environment loading and shutdown
└── docs/                # Repository-wide development guides
```

## First-time setup

This README runs the whole app. For running, configuring, or building an individual service,
use its local README. All commands run from the repository root.

Requires Node 24+, Git, Make, Docker, and Docker Compose **2.32.2+**.
`make dev` requires the one-time [Sentry installation](telemetry/sentry/README.md#run-locally),
including its CPU, memory, and disk requirements.

```bash
npm ci                       # Install host tools and dependencies
cp .env.example .env         # Create the single local configuration file
```

Configure all the variables, defaults and requirements are documented in [.env.example](.env.example). You can also check service specific README's for more info.

## Run the whole app

```bash
make dev                     # Start Sentry, then the app with Compose Watch
# In another terminal, or after leaving the foreground command:
make down                    # Stop both Compose projects; keep their data
```

This starts web, worker, PostgreSQL, Redis, and MinIO alongside Sentry. Database migrations and
private bucket initialization must succeed before web and worker start.

| Service             | Local address                                     |
| ------------------- | ------------------------------------------------- |
| Web                 | <http://localhost:5173>                           |
| Sentry              | <http://localhost:9090>                           |
| MinIO API / console | <http://localhost:9000> / <http://localhost:9001> |
| PostgreSQL          | `127.0.0.1:55432`                                 |
| Redis               | `127.0.0.1:6379`                                  |

Published ports bind to loopback. Compose Watch reloads web source and restarts the worker on
source changes; dependency and service build-file changes rebuild the affected image.
After environment, Compose, or migration changes, restart with `make down` followed by `make dev`.

### Host alternative

After the first-time configuration, run web and worker on the host with infrastructure in Docker.
Use one workflow at a time to avoid port collisions and duplicate workers.

```bash
npm run docker:up            # Start PostgreSQL, Redis, MinIO, and bucket initialization
npm run db:migrate           # Apply migrations before starting application processes
make telemetry-up            # Optional: requires Sentry installation and configured DSNs
npm run dev                  # Start web + worker; Ctrl+C stops both host processes
# After stopping the host processes:
npm run docker:down          # Stop application infrastructure; keep its data
make telemetry-down          # Stop Sentry if started; keep its data
```

Leave Sentry DSNs empty when using the host workflow without Sentry. Host commands read `.env`;
existing process variables take precedence.

## Checks

```bash
npm run check                # Format, typecheck, lint, and unit tests; required before finishing
```

The gate requires no Docker or external services. CI runs the corresponding checks with
non-writing formatting validation. Runtime testing is left to the user.

Unit tests live in each component's `test/` directory and run together through the root gate.
Keep the suite small and focused on application behavior; add coverage as the app grows.

## Development guides

- [Code organization](docs/code-organization.md) — imports, server boundaries, generated files, and configuration ownership.
- Component READMEs link to task-specific guides and production commands.
- [Agent instructions](AGENTS.md) — repository rules and routing to scoped instructions.

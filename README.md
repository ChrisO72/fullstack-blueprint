# Web App Blueprint

A battle tested template for a complete web application.
Each part of the app has its own dedicated README file for more info.

Cool stuff included: [TypeScript](https://www.typescriptlang.org/) | [React](https://react.dev/) | [React Router](https://reactrouter.com/) | [PostgreSQL](https://www.postgresql.org/) | [Redis](https://redis.io/) | [Vite](https://vite.dev/) | [Tailwind CSS](https://tailwindcss.com/) | [Drizzle ORM](https://orm.drizzle.team/) | [BullMQ](https://bullmq.io/) | [Headless UI](https://headlessui.com/) | [Motion](https://motion.dev/) | [Zod](https://zod.dev/) | [Heroicons](https://heroicons.com/) | [Lettermint](https://lettermint.co/)

| Component                            | Purpose and setup                      |
| ------------------------------------ | -------------------------------------- |
| [Web](web/README.md)                 | React Router UI and server routes      |
| [Worker](worker/README.md)           | BullMQ jobs and scheduled tasks        |
| [Database](db/README.md)             | PostgreSQL, Drizzle, and migrations    |
| [Mail](mail/README.md)               | Lettermint email delivery              |
| [Storage](storage/README.md)         | Private S3 storage and local SeaweedFS |
| [Telemetry](telemetry/README.md)     | Application monitoring and debugging   |
| [Sentry](telemetry/sentry/README.md) | Hosted monitoring setup and tooling    |

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
│   └── sentry/          # Hosted provider setup, CLI, and artifact uploads
├── runtime/             # Shared environment loading and shutdown
├── docs/                # Repository-wide development guides
└── .agents/skills/      # Repository-specific development workflow skills
```

## First-time setup

This README runs the whole app. For running, configuring, or building an individual service,
use its local README. All commands run from the repository root.

Requires Node 24+, Git, Make, Docker, and Docker Compose **2.32.2+**.

```bash
npm ci                       # Install host tools and dependencies
cp .env.example .env         # Create the single local configuration file
```

Configure the variables in `.env` for your needs; [.env.example](.env.example) documents their
defaults and requirements. Replace the three secret placeholders with different random values
using the instructions in the [Web README](web/README.md#configuration).

These integrations are optional. Check each README for configuration instructions:

- **Email:** enable account confirmation and password-reset emails with Lettermint, or leave its
  settings empty. See the [Mail README](mail/README.md#configuration).
- **File storage:** enable file uploads with S3; local SeaweedFS defaults are already included.
  See the [Storage README](storage/README.md#configuration).
- **Monitoring:** enable hosted Sentry reporting, or leave both DSN fields empty to disable it.
  See the [Sentry README](telemetry/sentry/README.md#setup).

## Run the whole app

```bash
make dev                     # Start the app; Ctrl+C to stop
make down                    # Remove containers but keep data
make reload                  # Apply .env and migration changes, then resume watching
```

`make dev` runs Compose in watch mode: code changes reload the related containers or trigger Vite HMR.

This starts web, worker, PostgreSQL, Redis, and SeaweedFS. SeaweedFS creates the private bucket
automatically. Database migrations must succeed and storage must pass its authenticated bucket
healthcheck before web and worker start.

| Service          | Local address           |
| ---------------- | ----------------------- |
| Web              | <http://localhost:5173> |
| SeaweedFS S3 API | <http://127.0.0.1:8333> |
| PostgreSQL       | `127.0.0.1:55432`       |
| Redis            | `127.0.0.1:6379`        |

## Checks

```bash
make check                   # Format, typecheck, lint, and unit tests
make check-web               # Web checks
make check-worker            # Worker checks
make check-db                # Database checks
make check-mail              # Mail checks
make check-storage           # Storage checks
make check-telemetry         # Telemetry checks
make check-runtime           # Runtime checks
```

Checks run locally. Component targets scope formatting, linting, and tests; typechecking stays project-wide.

## Development guides

- [Code organization](docs/code-organization.md) — imports, server boundaries, generated files, and configuration ownership.
- [Agent development workflow](docs/agent-workflow.md) — issue planning, reviews, implementation, functional verification, and documentation sync.
- Component READMEs link to task-specific guides and production commands.
- [Agent instructions](AGENTS.md) — repository rules and routing to scoped instructions.

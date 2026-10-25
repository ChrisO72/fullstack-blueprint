# Code organization

Read this when changing imports, shared module boundaries, generated files, or environment handling.
Service-specific patterns live beside their code and are linked from the component READMEs.

## Imports and server boundaries

TypeScript strict mode is enabled. Use the aliases in [tsconfig.json](../tsconfig.json) for
cross-package and multi-level imports:

| Alias           | Location            |
| --------------- | ------------------- |
| `~/*`           | `web/*`             |
| `~/db/*`        | `db/*`              |
| `~/mail/*`      | `mail/*`            |
| `~/storage/*`   | `storage/*`         |
| `~/worker/*`    | `worker/*`          |
| `~/telemetry/*` | `telemetry/*`       |
| `~/runtime/*`   | `runtime/*`         |
| `~/env.server`  | `web/env.server.ts` |

Sibling and single-parent imports (`./foo`, `../foo`) are fine within a package. ESLint rejects
imports starting with `../../`. Server-only modules use `.server.ts` and must never enter client
components. Web and worker database access goes through [repositories](../db/repositories/repository.md).

## Generated files

- `.react-router/` — generated route types; use them in loaders and actions.
- `build/` — compiled application, telemetry, and migration artifacts.
- `db/drizzle/` — migrations generated through the [schema workflow](../db/schema.md); never edit by hand.

## Configuration ownership

Root `.env` is the single local configuration file and is git-ignored. [.env.example](../.env.example)
documents defaults and optional integrations. Host commands load it without overriding existing
process variables. Compose selects explicit variables for each container rather than passing the
complete file. Standalone deployments supply variables through their deployment environment.

Each component owns its `config.ts` schema and environment validation. Database tools need only
`DATABASE_URL`; worker modules do not require web authentication secrets. Shared loading and
optional-value handling live in [runtime/env.server.ts](../runtime/env.server.ts) and
[runtime/config.ts](../runtime/config.ts).

Mail and storage are shared integrations, not additional application processes. Agent and
source-map tokens are host-tool-only. Sentry's provider secrets stay under `telemetry/sentry/.local/`.

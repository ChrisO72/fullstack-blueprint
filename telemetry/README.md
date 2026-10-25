# Telemetry

Application instrumentation, redaction, queue context, release identity, and shared build helpers
live here. Provider-specific hosting and tooling live under [sentry/](sentry/).
`stack.sh setup|up|down` delegates to that provider's shell entry point. Shell entry points work
from any directory; they manage Docker on the host, not from inside a container.

Browser, web server, and worker share Sentry project `blueprint/blueprint`, distinguished by
`service` and `runtime` tags. JavaScript SDKs are pinned to 11.2.0 and the upstream self-hosted stack
to 26.10.0. Web and worker own their builds and startup commands.

## One-time local installation

Install Node 24+, Git, Docker, and Docker Compose 2.32.2 or newer. Allocate the resources required
by the upstream installer (at least 4 CPU cores, 16 GB memory, and 20 GB free disk; see the
[upstream requirements](https://develop.sentry.dev/self-hosted/)). The installer performs its own
platform/resource checks; the repository does not bypass them.

1. Run `npm ci`, copy `.env.example` to `.env`, and configure application secrets.
2. Run `make telemetry-setup`. It clones the pinned distribution into `telemetry/sentry/.local/self-hosted/`,
   creates the ingress network, generates local configuration, runs the official installer, and
   starts Sentry. Create the administrator when prompted. Installation reports are not sent upstream.
3. Open <http://localhost:9090>, sign in, and create organization `blueprint` and project `blueprint`
   using the React Router platform. Use the SDK configuration in this repository; do not run a wizard.
4. In the project's Client Keys (DSN), copy the DSN into **both** `SENTRY_DSN` and
   `SENTRY_PUBLIC_DSN` in `.env`. It should look like `http://PUBLIC_KEY@localhost:9090/PROJECT_ID`.
5. Create a personal token with `org:read`, `project:read`, `team:read`, and `event:read` for
   `SENTRY_AGENT_TOKEN`. Create a separate artifact-upload token with `org:read` and
   `project:releases` for `SENTRY_UPLOAD_TOKEN`. Keep both in `.env`; they are never embedded in HTML.

The upstream stack uses its own fixed `sentry-*` external volumes. Setup refuses to adopt volumes
from another installation. Use a separate Docker context if you already host Sentry on this engine.
A failed first installation can be rerun in the same checkout. Do not delete its ownership marker
or change its pinned checkout to upgrade it implicitly.

## Daily commands

```sh
make dev             # start Sentry, then app Compose Watch
make down            # stop both projects; retain volumes
make telemetry-up       # start only Sentry
make telemetry-down     # stop only Sentry; retain volumes
```

`make dev` requires the one-time setup. Application processes still work without DSNs (console
logging, no remote SDK) and continue serving if Sentry becomes unavailable. `npm run dev` is the
host-process alternative; start Sentry separately with `make telemetry-up` when using it.

The Sentry-owned `compose.app.yml` overlay adds the ingress network and internal ingestion origin
for `make dev`. Base application Compose has no dependency on that network. Only ingress is shared between projects. Browser and host processes use `localhost:9090`; app
containers rewrite the server DSN host to `sentry-ingest` through `SENTRY_INGEST_ORIGIN`.
Browser DSNs are never rewritten. Sentry databases remain on its private network. Loopback ports
9000 and 9001 remain reserved for application storage. `npm run docker:down` and `docker:wipe`
manage the application project only.

Event retention is three days; upstream cleanup is asynchronous and individual signal retention
can differ. `telemetry/sentry/.local/` contains credentials and installed upstream sources and is excluded from
Git, builds, Compose Watch, formatting, linting, and TypeScript. Upgrades require an explicit
version/configuration change and the upstream upgrade procedure; daily startup never upgrades.

## Signals and data policy

Server and worker instrumentation is preloaded before dependencies and lives outside HMR.
PostgreSQL, Redis, HTTP, and fetch use Sentry's SDK integrations. React Router owns route-level
tracing, including loaders, actions, middleware, and streaming error reporting.

Queues carry Sentry trace context in BullMQ metadata. Legacy W3C-only metadata, invalid JSON,
invalid trace headers, or `omitContext` starts a new consumer trace without dropping the job.
Each attempt uses its own scope. Retries preserve the original error and application behavior.

Use `log.info`/`log.warn` from `~/telemetry/log.server` for server/worker structured logs.
Use `log.error(message, error, fields)` at the boundary that handles a failure; it captures an
exception as well as a log. A helper that rethrows should add context and let its caller capture.
Browser code uses `@sentry/react-router` directly. Avoid raw payloads in messages or attributes.

We retain scrubbed messages, exception chains, stack frames, and source locations. SDK collection
of cookies, headers, bodies, database parameters, queue payloads, user info, and local variables is
disabled. Outgoing hooks also scrub credential patterns, email addresses, and sensitive URLs;
only approved scalar attributes survive. SQL text is omitted from spans. This is not a guarantee
that arbitrary secrets hidden in free-form text can be recognized: never deliberately log them.
Replay masks all text/inputs, blocks media, and excludes request/response bodies.
If a page visits a URL needing redaction (including query strings, fragments, and token paths),
that replay segment and subsequent segments until a full page reload are dropped because the SDK's
compressed DOM metadata cannot be safely rewritten by its hooks. Error and trace reporting continues.

Local trace and replay sample rates default to 1. Configure the `SENTRY_*_SAMPLE_RATE` values for
other environments. Application SDK initialization is disabled during tests; focused SDK unit tests
use an in-memory transport with instrumentation disabled. Request/job metrics are:

- `http.server.requests`: counter by method, matched route, status.
- `http.server.request.duration`: distribution in seconds with the same attributes.
- `job.attempts`: counter by job name and outcome.
- `job.duration`: distribution in seconds with the same attributes.

## Source maps and releases

```sh
npm run build          # source maps and debug IDs; no upload credentials required
npm run sentry:upload  # upload that build explicitly, using SENTRY_UPLOAD_TOKEN
```

Uploads include browser/server output, worker, and the SDK preload. Upload failures fail the command.
Debug IDs are injected before the artifacts are deployed; upload does not rewrite running artifacts.
Each build stages uploadable pairs in `build/<service>/sentry-artifacts/` and removes browser
`.map` files from `build/web/client/`. Keep artifact directories private. The default upload command
processes both builds; `npm run sentry:upload -- web` or `-- worker` selects one. For container builds,
extract the service's build directory from its image into the corresponding host `build/` location
before uploading. Upload the exact artifacts shipped in that image, not a separate rebuild.

Set the same `SENTRY_RELEASE` build argument for both production images. Host `npm run build`
resolves one identifier and passes it to both builds. Individual host builds derive
`blueprint@<git-sha>` (with `-dirty` for working changes) unless explicitly supplied; container builds
default to `blueprint@local`. Each build writes `build/<service>/release.json`; production startup
reads that identifier without Git. An explicit runtime `SENTRY_RELEASE` overrides it and must match
the uploaded artifacts. `make dev` passes a host-derived identifier into both containers.
SDK configuration changes require a restart.

Vite development code changes through HMR and is not an immutable uploaded build. Agents should
match reported source filenames against the current checkout and account for edits made after an
event. Uploaded source context describes its build, not subsequent working-tree changes. GitHub
suspect-commit integration, profiling, and hosted Seer are not configured.

## Agent debugging

Use `npm run sentry -- <command>`: it selects the local instance and read-only agent token,
keeps CLI state under `telemetry/sentry/.local/cli/`, and does not pass the artifact-upload token to the CLI.
No global install or cloud Sentry account is needed. Credentials require a user account on the local
instance. The wrapper also supports `SENTRY_URL`, `SENTRY_ORG`, and `SENTRY_PROJECT` overrides.

```sh
npm run sentry -- issue list
npm run sentry -- issue view BLUEPRINT-1
npm run sentry -- event --help
npm run sentry -- trace --help
npm run sentry -- explore --help
npm run sentry -- schema --search events
```

Start with recent issues filtered to the relevant environment and service. Inspect an event's
exception chain and original stack frames, follow its trace ID into the request and queue spans,
and query logs in that time window. Use the CLI's `--help` for filters and JSON output. Compare the
reported release with the current checkout before treating a source line as current. An error log
alone is not proof that an exception event was captured; inspect the actual event.

These commands read previously recorded evidence. They do not authorize running the application,
triggering failures, or performing runtime tests. `npm run check` is the only implementation gate;
it uses in-memory dependencies and requires neither Docker nor a Sentry instance.

## Application environment

All Sentry variables are optional. Set `SENTRY_DSN` for server/worker transport and
`SENTRY_PUBLIC_DSN` for the browser. `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`,
`SENTRY_REPLAYS_SESSION_SAMPLE_RATE`, and `SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` control labels
and sampling. `SENTRY_SERVICE` is set by the web/worker commands and images. The development overlay
sets `SENTRY_INGEST_ORIGIN` for internal server routing; host processes use the DSN unchanged.

Only host tools receive `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AGENT_TOKEN`, and
`SENTRY_UPLOAD_TOKEN`. They are never passed through application Compose environment mappings.

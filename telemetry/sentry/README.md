# Sentry provider

Local self-hosted Sentry, pinned to 26.10.0. All commands run from the repository root.

## Configuration

After installation, put these values in the application's root `.env`:

```dotenv
SENTRY_DSN=                  # Copy the project's Client Keys (DSN) value
SENTRY_PUBLIC_DSN=           # Copy the same DSN for the browser
SENTRY_URL=http://localhost:9090 # Host CLI and artifact-upload endpoint
SENTRY_ORG=blueprint         # Organization slug
SENTRY_PROJECT=blueprint     # Project slug
SENTRY_AGENT_TOKEN=          # Read-only personal token for investigations
SENTRY_UPLOAD_TOKEN=         # Separate token for artifact uploads
```

A local DSN looks like `http://PUBLIC_KEY@localhost:9090/PROJECT_ID` (replace both placeholders).
Create tokens with these scopes:

| Token  | Scopes                                                |
| ------ | ----------------------------------------------------- |
| Agent  | `org:read`, `project:read`, `team:read`, `event:read` |
| Upload | `org:read`, `project:releases`                        |

Tokens stay in host tooling and are never exposed to the browser. Internal Sentry secrets and
`.env.custom` belong to the installation under `.local/`, separate from application `.env`.
Application sampling and labels are documented in [telemetry configuration](../README.md#configuration).

## Run locally

### One-time installation

Requires Node 24+, Git, Make, Docker, and Compose **2.32.2+**. Allocate at least 4 CPU cores,
16 GB memory, and 20 GB free disk for the pinned upstream installer; its resource/platform checks
are not bypassed. See the [upstream requirements](https://develop.sentry.dev/self-hosted/).

```bash
npm ci                       # Install host tools
cp .env.example .env         # First checkout only; preserve an existing .env
make telemetry-setup         # Install and start Sentry; create an administrator when prompted
```

1. Open <http://localhost:9090> and sign in.
2. Create organization `blueprint` and project `blueprint`, choosing the React Router platform.
   Use this repository's SDK configuration; do not run a setup wizard.
3. Copy the project's Client Keys DSN into both DSN fields above.
4. Create the separate agent and upload tokens above when using those tools.

Setup clones the pinned distribution into `.local/self-hosted/`, creates the ingress network,
generates configuration, and runs the official installer. Installation reports are not sent upstream.
A failed first installation can be rerun in the same checkout.

### Daily commands

```bash
make telemetry-up            # Start only Sentry; requires completed installation
make telemetry-down          # Stop only Sentry; retain volumes
```

For Sentry and the application together, use the [root workflow](../../README.md#run-the-whole-app).
The shell entry points `telemetry/stack.sh` and `telemetry/sentry/stack.sh` also accept
`setup`, `up`, and `down`, work from any directory, and manage Docker on the host.

### Networking and data

Only ingress is shared with the application. `compose.app.yml` connects web/worker to it;
`compose.override.yml` connects upstream Sentry. Browser and host processes use `localhost:9090`;
the application overlay rewrites only the server DSN to `sentry-ingest` through `SENTRY_INGEST_ORIGIN`.
Base application Compose has no dependency on this network. Sentry databases remain private.

The stack uses fixed external `sentry-*` volumes. Setup refuses to adopt unrelated installations;
use a separate Docker context if Sentry already exists on the engine. Keep the installation
ownership marker. Application `docker:down` and `docker:wipe` commands do not remove Sentry data.
Event retention is three days, with asynchronous upstream cleanup and signal-specific differences.

`.local/` contains upstream sources, credentials, and CLI state. It is excluded from Git, builds,
Compose Watch, formatting, linting, and TypeScript. Upgrades require an explicit version/configuration
change and the upstream procedure; daily startup never upgrades. There is no legacy installation
relocation or discovery path.

## Development guides

- [Releases](releases.md) — artifact uploads, release identity, and production build handling.
- [Debugging](../debugging.md) — read-only CLI access and source matching.
- [Instrumentation](../instrumentation.md) — application integration and data policy.

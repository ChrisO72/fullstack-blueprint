# Sentry provider

Hosted [Sentry](https://sentry.io/) provides monitoring for browser, web server, and worker.
This directory contains provider setup, the read-only debugging CLI, and source-map uploads.
All commands run from the repository root.

## Setup

1. Create a Sentry account and organization, then create a project with the React Router platform.
   Use the SDK integration already included in this blueprint; skip the setup wizard's code changes.
2. In Project Settings → Client Keys (DSN), copy the DSN into both `SENTRY_DSN` and
   `SENTRY_PUBLIC_DSN` in root `.env`. Copy it exactly, including its regional ingestion hostname.
3. Run the app using the [root workflow](../../README.md#run-the-whole-app), or the web/worker
   host workflows. Restart application processes after changing SDK configuration.

Browser, web, and worker use the same project, distinguished by `service` and `runtime` tags.
Both DSN fields are optional; leaving them empty disables remote reporting. DSNs enable event
submission and can be public. API tokens grant additional access and must remain private.

## Configuration

```dotenv
SENTRY_DSN=                  # Project DSN for server and worker
SENTRY_PUBLIC_DSN=           # Same project DSN for browser reporting

# Optional host/CI tooling; not needed to run the app or build artifacts.
SENTRY_URL=https://sentry.io  # Default CLI and artifact-upload endpoint; optional override
SENTRY_ORG=                  # Your organization slug
SENTRY_PROJECT=              # Your project slug
SENTRY_AGENT_TOKEN=          # Read-only token for investigations
SENTRY_UPLOAD_TOKEN=         # Separate token for artifact uploads
```

Use slugs from Sentry settings, not display names or numeric IDs. Both slugs and the appropriate
command's token are required when invoking the tools. Only the DSNs are needed for reporting.
Application sampling and labels are documented in [telemetry configuration](../README.md#configuration).

### Tooling tokens

Create separate personal tokens in Sentry's account settings with these scopes:

| Token  | Scopes                                                |
| ------ | ----------------------------------------------------- |
| Agent  | `org:read`, `project:read`, `team:read`, `event:read` |
| Upload | `org:read`, `project:releases`                        |

The token's user must have access to the configured organization and project. See Sentry's
[API authentication](https://docs.sentry.io/api/auth/) and
[permissions](https://docs.sentry.io/api/permissions/) documentation.
Store tokens in ignored root `.env` for host tools or in the CI environment for uploads.
Application Compose mappings and browser configuration never include these tokens. The debugging
wrapper selects the agent token and removes the upload token from its child process environment.

```bash
npm run sentry -- issue list  # Read existing issues using SENTRY_AGENT_TOKEN
npm run sentry:upload         # Upload built artifacts using SENTRY_UPLOAD_TOKEN
```

The [CLI](https://cli.sentry.dev/configuration/) defaults to hosted Sentry. Its state is kept under
ignored `.local/cli/`, excluded from Git, application images, Compose Watch, formatting, linting,
and TypeScript. Provider retention and quotas are managed in the hosted account.

## Development guides

- [Releases](releases.md) — artifact uploads, release identity, and production build handling.
- [Debugging](../debugging.md) — read-only CLI access and source matching.
- [Instrumentation](../instrumentation.md) — application integration and data policy.

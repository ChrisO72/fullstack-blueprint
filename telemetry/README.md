# Telemetry

Hosted Sentry monitoring for browser, web server, and worker. Application instrumentation lives
here; provider setup and tooling live in [sentry/](sentry/README.md).
All commands run from the repository root.

## Configuration

All application Sentry settings are optional. Configure them in root `.env`:

```dotenv
SENTRY_DSN=                           # Server/worker DSN from your hosted Sentry project
SENTRY_PUBLIC_DSN=                    # Browser DSN from the same project
SENTRY_ENVIRONMENT=development        # Event label; defaults to NODE_ENV when omitted
SENTRY_RELEASE=                       # Optional override; otherwise derived from Git/build
SENTRY_TRACES_SAMPLE_RATE=            # Blank uses environment default; explicit 0–1 overrides
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=    # Blank uses environment default; explicit 0–1 overrides
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=   # Blank defaults to 1; explicit 0–1 overrides
```

Use the [Sentry setup](sentry/README.md#setup) to create an account and project, then copy the same
project DSN into both DSN fields. Browser, web, and worker share that project, distinguished by
`service` and `runtime` tags. Startup commands set `SENTRY_SERVICE`.
Only public telemetry configuration reaches the browser.

Empty or omitted sample rates use these defaults:

| Signal                   | Development | Production (`NODE_ENV=production`) |
| ------------------------ | ----------- | ---------------------------------- |
| Traces                   | 100%        | 20%                                |
| Ordinary session replays | 100%        | 20%                                |
| Error-triggered replays  | 100%        | 100%                               |

Other runtime modes use development defaults; SDK initialization is disabled during tests.
`SENTRY_ENVIRONMENT` labels events without changing these defaults. Explicit rates override
individual defaults, including zero to disable that sampled signal. Error events remain fully
sampled subject to existing filters and provider limits. Adjust production rates to your traffic
and hosted quotas; 20% is this blueprint's starting point, not a universal standard.
Replays retain the masking and redaction described in [instrumentation](instrumentation.md).

## Run locally

Use the [whole-app workflow](../README.md#run-the-whole-app) or the individual host workflows.
Configured SDKs send directly to hosted Sentry from either workflow. Restart application processes
after SDK configuration changes.

Without DSNs, application processes use console logging with remote reporting disabled. They
continue serving if Sentry becomes unavailable. The pinned JavaScript SDK version is 11.2.0.

## Production

Supply hosted DSNs and set `SENTRY_ENVIRONMENT=production` (or your deployment's label).
Startup commands set `NODE_ENV=production`, which selects production sampling defaults unless
explicit rates are supplied. Give web and worker the same release identifier. Follow
[releases and source maps](sentry/releases.md) for artifact uploads. Agent and upload tokens belong
only to host/CI tooling; application Compose mappings do not pass them to containers.

## Development guides

- [Instrumentation](instrumentation.md) — logs, traces, metrics, redaction, and lifecycle.
- [Debugging](debugging.md) — investigating existing issues, events, logs, and traces.
- [Releases](sentry/releases.md) — build identity and source-map uploads.
- [Sentry setup](sentry/README.md) — hosted account, project, and tooling credentials.

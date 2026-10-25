# Telemetry

Sentry monitoring for browser, web server, and worker. Application instrumentation lives here;
local hosting and provider tooling live in [sentry/](sentry/README.md).
All commands run from the repository root.

## Configuration

All application Sentry settings are optional. Configure them in root `.env`:

```dotenv
SENTRY_DSN=                           # Server/worker DSN from your Sentry project
SENTRY_PUBLIC_DSN=                    # Browser DSN from the same project
SENTRY_ENVIRONMENT=development        # Label attached to events
SENTRY_RELEASE=                       # Optional override; otherwise derived from Git/build
SENTRY_TRACES_SAMPLE_RATE=1           # 0–1; local default captures every trace
SENTRY_REPLAYS_SESSION_SAMPLE_RATE=1   # 0–1; local default captures every masked replay
SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1  # 0–1; replay sampling when an error occurs
```

Use the [Sentry setup](sentry/README.md) to obtain local DSNs and host-tool tokens. Browser, web,
and worker share project `blueprint/blueprint`, distinguished by `service` and `runtime` tags.
Startup commands set `SENTRY_SERVICE`; the whole-app Compose overlay sets `SENTRY_INGEST_ORIGIN`
for server routing. Only public telemetry configuration reaches the browser.

## Run locally

Finish the [one-time Sentry installation](sentry/README.md#run-locally), then use the
[whole-app workflow](../README.md#run-the-whole-app). For host application processes, start
Sentry separately using its local README. Restart application processes after SDK configuration changes.

Without DSNs, application processes use console logging with remote reporting disabled. They
continue serving if Sentry becomes unavailable. The pinned JavaScript SDK version is 11.2.0.

## Production

Supply DSNs reachable by the deployed services and browser, select sampling rates, and give web
and worker the same release identifier. Follow [releases and source maps](sentry/releases.md)
for artifact uploads. Agent and upload tokens belong only to host tooling; application Compose
mappings do not pass them to containers.

## Development guides

- [Instrumentation](instrumentation.md) — logs, traces, metrics, redaction, and lifecycle.
- [Debugging](debugging.md) — investigating existing issues, events, logs, and traces.
- [Releases](sentry/releases.md) — build identity and source-map uploads.
- [Sentry setup](sentry/README.md) — installation, credentials, and lifecycle commands.

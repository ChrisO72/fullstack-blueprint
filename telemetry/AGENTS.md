# Telemetry instructions

This area owns application instrumentation, redaction, and release integration.

- Preserve sensitive-data redaction and keep host-tool tokens out of application/browser configuration.
- Capture exceptions at the handling boundary; avoid duplicate captures when rethrowing.

Read [instrumentation.md](instrumentation.md) when changing logs, traces, metrics, redaction, or shutdown.
Read [debugging.md](debugging.md) when investigating recorded issues, events, or traces.
Use [README.md](README.md) for application telemetry configuration.
Before editing provider tooling, read [sentry/AGENTS.md](sentry/AGENTS.md); use
[sentry/README.md](sentry/README.md) for setup and [sentry/releases.md](sentry/releases.md) for build artifacts.

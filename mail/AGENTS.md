# Mail instructions

This area owns server-only email transport and templates; workers perform delivery.

- Keep provider access in `client.server.ts` and each email type in its own server module.
- Web routes enqueue delivery jobs rather than contacting the provider directly.

Read [templates.md](templates.md) when adding or changing an email, and
[worker/jobs.md](../worker/jobs.md) when connecting its delivery job.
Use [README.md](README.md) for provider configuration and
[telemetry/instrumentation.md](../telemetry/instrumentation.md) for error-reporting changes.

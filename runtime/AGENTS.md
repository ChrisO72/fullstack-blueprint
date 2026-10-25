# Runtime instructions

This area owns shared environment loading and process/resource shutdown.

- Keep environment validation in the owning component; shared loading must not require unrelated secrets.
- Preserve shutdown ordering: drain application work, close shared resources, then flush telemetry.
- Preserve shared state across preloaded and bundled code and the bounded process shutdown deadline.

For environment changes, read [env.server.ts](env.server.ts), [config.ts](config.ts), and
[configuration ownership](../docs/code-organization.md#configuration-ownership).
For shutdown changes, read [lifecycle.server.ts](lifecycle.server.ts), [process.server.ts](process.server.ts),
and [telemetry/instrumentation.md](../telemetry/instrumentation.md#shutdown).

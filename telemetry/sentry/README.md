# Sentry provider

This directory owns the complete self-hosted Sentry boundary:

- `stack.sh setup|up|down` is the host entry point, delegating installation and lifecycle work to `manage.ts`.
- `.local/self-hosted/` holds the pinned upstream checkout, installation markers, generated configuration, and secrets. It is not committed or copied into application images.
- `compose.override.yml` attaches upstream ingress to the shared application network.
- `compose.app.yml` attaches web and worker to that ingress network when used by `make dev`.
- `cli.ts` uses the read-only agent token; `upload.ts` uses the separate source-map upload token.
- `.local/cli/` holds local CLI state.

Run `make telemetry-setup` once from a fresh checkout, then follow [the telemetry guide](../README.md)
to create the Sentry project and configure DSNs. `make telemetry-up` and `make telemetry-down`
manage this stack independently. Setup pins the upstream version and refuses to adopt an unrelated
installation's volumes. Daily startup requires a completed installation of that version.
There is no legacy installation discovery, relocation, or upgrade path in this blueprint.

Internal secrets and `.env.custom` belong to this installation. Application `.env` and provider
configuration are separate. The provider shell entry point can be called from any working directory.

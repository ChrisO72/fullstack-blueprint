# Sentry provider instructions

This directory owns self-hosted Sentry installation, lifecycle, the read-only CLI, and artifact uploads.

- Keep upstream sources, generated credentials, and CLI state under ignored `.local/`.
- Preserve installation ownership checks; daily startup must not adopt or upgrade unrelated installations.
- Keep the read-only agent token separate from the upload token; never forward the upload token to the CLI.

Read [README.md](README.md) when changing installation, networking, or configuration.
Read [releases.md](releases.md) before changing release identity or artifact uploads.
Read [debugging.md](../debugging.md) for investigation commands and source matching.

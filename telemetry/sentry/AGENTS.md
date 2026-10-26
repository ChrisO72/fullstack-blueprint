# Sentry provider instructions

This directory owns hosted Sentry setup documentation, the read-only CLI, and artifact uploads.

- Keep CLI state under ignored `.local/`; credentials belong in host/CI environment configuration.
- Keep the read-only agent token separate from the upload token; never forward the upload token to the CLI.

Read [README.md](README.md) when changing provider setup or configuration.
Read [releases.md](releases.md) before changing release identity or artifact uploads.
Read [debugging.md](../debugging.md) for investigation commands and source matching.

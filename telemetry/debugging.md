# Debugging recorded application errors

Read this when investigating existing Sentry issues, logs, events, or traces.
Set up the read-only agent token using [sentry/README.md](sentry/README.md#configuration).
Run commands from the repository root.

Use `npm run sentry -- <command>`: it selects hosted Sentry and the read-only agent token,
keeps CLI state under `telemetry/sentry/.local/cli/`, and does not pass the artifact-upload token to the CLI.
No global install is needed. Configure `SENTRY_ORG` and `SENTRY_PROJECT` with your hosted slugs.
The endpoint defaults to `https://sentry.io`; `SENTRY_URL` optionally overrides it.

```bash
npm run sentry -- issue list                 # Find existing issues
npm run sentry -- issue view BLUEPRINT-1     # Inspect an issue; replace the example ID
npm run sentry -- event --help              # Event inspection options
npm run sentry -- trace --help              # Trace inspection options
npm run sentry -- explore --help            # Query recorded signals
npm run sentry -- schema --search events    # Discover event fields
```

Start with recent issues filtered to the relevant environment and service. Inspect an event's
exception chain and original stack frames, follow its trace ID into the request and queue spans,
and query logs in that time window. Use the CLI's `--help` for filters and JSON output. Compare the
reported release with the current checkout before treating a source line as current. An error log
alone is not proof that an exception event was captured; inspect the actual event.

These commands read previously recorded evidence. They do not authorize running the application,
triggering failures, or performing runtime tests. `npm run check` is the only implementation gate;
it uses in-memory dependencies and requires neither Docker nor a Sentry instance.

## Matching source code

Vite development code changes through HMR and is not an immutable uploaded build. Agents should
match reported source filenames against the current checkout and account for edits made after an
event. Uploaded source context describes its build, not subsequent working-tree changes. GitHub
suspect-commit integration, profiling, and hosted Seer are not configured.

Read [sentry/releases.md](sentry/releases.md) when investigating artifact or release mismatches.

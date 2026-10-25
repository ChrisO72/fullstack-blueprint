# Repository instructions

Read [README.md](README.md) for project orientation. Before editing an area, read its local
`AGENTS.md` and any deeper instructions governing the affected files. Open only the topic guides
needed for the task; a root-started session may not have loaded nested instructions.

## Universal rules

- Run `npm run check` before finishing changes. It is the only verification gate.
- Never perform or plan runtime testing, start services, or trigger application requests for verification.
  Leave runtime testing to the user.
- Do not silence the type checker: no `any`, `@ts-ignore`, or unjustified `eslint-disable`.
- Keep credentials out of code, documentation, and logs.

## Read when relevant

| Work                                | Instructions                               |
| ----------------------------------- | ------------------------------------------ |
| Web routes, auth, or UI             | [web/AGENTS.md](web/AGENTS.md)             |
| Jobs or schedules                   | [worker/AGENTS.md](worker/AGENTS.md)       |
| Schema, migrations, or repositories | [db/AGENTS.md](db/AGENTS.md)               |
| Email                               | [mail/AGENTS.md](mail/AGENTS.md)           |
| File storage                        | [storage/AGENTS.md](storage/AGENTS.md)     |
| Monitoring or Sentry tooling        | [telemetry/AGENTS.md](telemetry/AGENTS.md) |
| Shared environment or shutdown      | [runtime/AGENTS.md](runtime/AGENTS.md)     |
| Unit tests                          | [test/AGENTS.md](test/AGENTS.md)           |

Read [code organization](docs/code-organization.md) when changing imports, shared boundaries,
generated files, or environment ownership.

For recorded errors, traces, or logs, read [telemetry/debugging.md](telemetry/debugging.md) and use
the repository-local Sentry CLI with its read-only agent token. Reading evidence does not authorize
running the application or triggering failures.

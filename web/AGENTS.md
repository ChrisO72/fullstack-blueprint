# Web instructions

This area owns the React Router application. Use [README.md](README.md) for configuration and operating commands.

- Import generated `Route` types from `./+types/<name>`; do not define your own loader/action argument types.
- Access the database through repositories, never the database client directly.
- Use existing [UI primitives](components/ui-kit/) when they fit.

Read only the guides relevant to the change:

- [routes.md](routes.md) for routes, loaders/actions, forms, and validation.
- [auth.md](auth.md) for sessions, permissions, protected routes, and auth rate limits.
- [ui.md](ui.md) for components and styling.
- [storage/uploads.md](../storage/uploads.md) for private-file routes.
- [db/repositories/repository.md](../db/repositories/repository.md) for data access.
- [telemetry/instrumentation.md](../telemetry/instrumentation.md) for logging, tracing, and lifecycle changes.

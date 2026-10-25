# Unit test instructions

This area contains Vitest unit tests using in-memory dependencies. Follow the root verification policy.
Tests must not require running application services, Docker, or external providers.

Read the relevant existing examples when changing coverage:

- [environment.test.ts](environment.test.ts) for component configuration boundaries.
- [rate-limit.test.ts](rate-limit.test.ts) for rate limiting with in-memory dependencies.
- [sentry.test.ts](sentry.test.ts) for telemetry policy, queue correlation, and lifecycle behavior.

Read the owning area's instructions and topic guide before changing assertions about its behavior.

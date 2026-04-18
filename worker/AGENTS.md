# worker/AGENTS.md

Background job processor: BullMQ jobs + node-cron schedules. See [worker/README.md](README.md) for the full pattern with code examples, and the repo-root [AGENTS.md](../AGENTS.md) for stack and commands.

## Hard rules

- New job? Add its name + payload type to `JobData` in [worker/jobs.ts](jobs.ts) and handle it in `processJob`. The `JobData` map is the single source of truth for end-to-end type safety between enqueue sites and handlers.
- Enqueue via the exported `defaultQueue` from [worker/queues.ts](queues.ts) — both from inside the worker and from web routes (`import { defaultQueue } from "../../worker/queues"`).
- Cron schedules belong in [worker/scheduler.ts](scheduler.ts). Cron format: `min hour day month weekday`.
- The worker is started by `npm run dev:worker` (already part of `npm run dev`). Do not spawn it manually.
- Keep handlers thin: validate input, delegate to a repository or service, let BullMQ handle retries (default 3 attempts).

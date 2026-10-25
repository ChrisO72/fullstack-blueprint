# Worker

Background job processing with BullMQ + node-cron.

## Running and configuration

`Dockerfile` defines `development`, `build`, and `production` targets; build with the repository
root as context. `docker compose up --build --watch worker` starts the worker and its infrastructure
without web or Sentry. `npm run dev:worker` runs on the host. `npm run build:worker` writes
`build/worker/`; `npm run start:worker` starts that build. The worker exposes no HTTP port.
See the root README for standalone production image commands.

Required by the worker and its jobs: `REDIS_URL`, `DATABASE_URL`, and `APP_URL`. Web authentication
secrets are not required. Optional `LETTERMINT_API_KEY` and `LETTERMINT_MAIL_FROM` enable delivery;
optional `S3_*` settings enable file jobs. Sentry settings are optional. Each integration validates
its own settings. Host commands read root `.env`; containers receive explicit environment values.

## Pattern

Each job owns its name, payload type, and handler. The dispatcher connects those modules to BullMQ,
and all producers enqueue through the typed `enqueueJob` API. A job can expose a small enqueue helper
when every producer should share options such as retries and retention.

### Defining Jobs

```typescript
// jobs/send-confirmation-email.ts
import { sendConfirmationEmail } from "~/mail/confirmation.server";
import { enqueueJob } from "../enqueue";

export const sendConfirmationEmailJobName = "sendConfirmationEmail" as const;

export type SendConfirmationEmailJobData = {
  to: string;
  token: string;
  expiresInHours: number;
};

export function enqueueConfirmationEmailJob(data: SendConfirmationEmailJobData) {
  return enqueueJob(sendConfirmationEmailJobName, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    jobId: `send-confirmation-email-${data.token}`,
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

export async function handleSendConfirmationEmailJob(data: SendConfirmationEmailJobData) {
  await sendConfirmationEmail(data);
}
```

Register the job in `jobs/dispatcher.ts` by importing its name, data type, and handler, adding it to
`JobData`, and adding a matching switch case:

```typescript
export type JobData = {
  [exampleJobName]: ExampleJobData;
  [sendConfirmationEmailJobName]: SendConfirmationEmailJobData;
};
```

### Scheduling Jobs

```typescript
// schedules/hourly-sync.ts
import cron from "node-cron";
import { enqueueJob } from "../enqueue";
import { syncUserJobName } from "../jobs/sync-user";

export function registerHourlySyncSchedule() {
  cron.schedule("0 * * * *", async () => {
    await enqueueJob(syncUserJobName, { userId: 123 });
  });
}
```

Import each registration function in `schedules/register.ts` and call it from `startSchedules`.

### Enqueue from App

```typescript
import { CONFIRMATION_TOKEN_EXPIRY_HOURS } from "~/lib/auth/email-confirmation.server";
import { enqueueConfirmationEmailJob } from "~/worker/jobs/send-confirmation-email";

// In a route action or loader
await enqueueConfirmationEmailJob({
  to: user.email,
  token,
  expiresInHours: CONFIRMATION_TOKEN_EXPIRY_HOURS,
});
```

## Guidelines

- Keep each job's payload type in its job file
- Register every job in `jobs/dispatcher.ts`
- Enqueue through `enqueueJob`; do not call the queue directly
- Put outbound email transport and per-email templates in `mail/`; worker handlers perform delivery
- Keep handlers and schedule callbacks focused and minimal
- Use cron expressions: `* * * * *` (min hour day month weekday)
- Configure `attempts` and `backoff` when a job should retry; BullMQ jobs run once by default

## Development and observability

`make dev` runs the worker in Node 24. Compose Watch owns synchronization and restarts; the host
alternative remains `npm run dev:worker`. Sentry initializes before application imports.

`enqueueJob` passes Sentry trace headers through BullMQ's `telemetry.metadata`, without changing job
payloads. Each consumer attempt has an isolated scope and connected queue span. Missing, malformed,
legacy, or omitted context starts a fresh trace. `telemetry.omitContext` prevents propagation.
Errors are captured at the dispatcher boundary and rethrown unchanged for BullMQ retries. Lower-level
mail failures add a log without capturing the exception twice. Job IDs are hashed because existing
IDs contain tokens; payloads are never logged. Attempt counts and durations use bounded labels.

SIGINT/SIGTERM stops the worker, drains jobs, closes shared resources, and flushes Sentry within the
existing 25-second deadline. Fatal process errors use the same path and exit nonzero. See
[telemetry/README.md](../telemetry/README.md) for agent access and the data policy.

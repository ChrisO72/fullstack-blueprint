# Background jobs and schedules

Read this when adding or changing a job, producer, retry policy, or schedule.

## Job pattern

Each job owns its name, payload type, and handler. The dispatcher connects those modules to BullMQ,
and all producers enqueue through the typed `enqueueJob` API. A job can expose a small enqueue helper
when every producer should share options such as retries and retention.

### Defining Jobs

```typescript
// jobs/send-confirmation-email.ts
import { createHash } from "node:crypto";
import { sendConfirmationEmail } from "~/mail/confirmation.server";
import { enqueueJob } from "../enqueue";

export const sendConfirmationEmailJobName = "sendConfirmationEmail" as const;

export type SendConfirmationEmailJobData = {
  to: string;
  token: string;
  expiresInHours: number;
};

export function enqueueConfirmationEmailJob(data: SendConfirmationEmailJobData) {
  const tokenDigest = createHash("sha256").update(data.token).digest("hex");

  return enqueueJob(sendConfirmationEmailJobName, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    jobId: `send-confirmation-email-${tokenDigest}`,
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

export async function handleSendConfirmationEmailJob(data: SendConfirmationEmailJobData) {
  await sendConfirmationEmail(data);
}
```

Register the job in `jobs/dispatcher.ts` by importing its name, data type, and handler, adding it to
`JobData`, the known-name list, and the handler switch. For example, add this entry to `JobData`:

```typescript
export type JobData = {
  // Keep the existing job entries.
  [sendConfirmationEmailJobName]: SendConfirmationEmailJobData;
};
```

### Scheduling Jobs

For a new `sync-user` job registered with a `{ userId: number }` payload, a schedule can enqueue it like this:

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

Use a digest when a stable job ID is derived from a secret; never put the raw token in the ID.
Read [mail/templates.md](../mail/templates.md) for email jobs and [storage/uploads.md](../storage/uploads.md)
for file jobs. Queue tracing, error capture, and shutdown belong to the
[instrumentation guide](../telemetry/instrumentation.md).

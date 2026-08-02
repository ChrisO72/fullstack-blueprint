# Worker

Background job processing with BullMQ + node-cron.

## Pattern

Each job owns its name, payload type, and handler. The dispatcher connects those modules to BullMQ,
and all producers enqueue through the typed `enqueueJob` API.

### Defining Jobs

```typescript
// jobs/send-email.ts
export const sendEmailJobName = "sendEmail" as const;

export type SendEmailJobData = {
  to: string;
  subject: string;
  body: string;
};

export async function handleSendEmailJob(data: SendEmailJobData) {
  // send email logic
}
```

Register the job in `jobs/dispatcher.ts` by importing its name, data type, and handler, adding it to
`JobData`, and adding a matching switch case:

```typescript
export type JobData = {
  [exampleJobName]: ExampleJobData;
  [sendEmailJobName]: SendEmailJobData;
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

The included `cleanupStaleFiles` schedule runs daily. It enqueues one organization-scoped job per
active organization to delete objects left by uploads that have remained `pending` for 24 hours,
then marks their metadata as `failed`. Its queue options provide three attempts with exponential
backoff.

### Enqueue from App

```typescript
import { enqueueJob } from "~/worker/enqueue";
import { sendEmailJobName } from "~/worker/jobs/send-email";

// In a route action or loader
await enqueueJob(sendEmailJobName, {
  to: user.email,
  subject: "Welcome",
  body: "Thanks for signing up!",
});
```

## Guidelines

- Keep each job's payload type in its job file
- Register every job in `jobs/dispatcher.ts`
- Enqueue through `enqueueJob`; do not call the queue directly
- Keep handlers and schedule callbacks focused and minimal
- Use cron expressions: `* * * * *` (min hour day month weekday)
- Configure `attempts` and `backoff` when a job should retry; BullMQ jobs run once by default

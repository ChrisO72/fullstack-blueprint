import type { JobsOptions } from "bullmq";
import { produceJob } from "~/observability/queue.server";
import { defaultQueue } from "./queues";
import type { JobData, JobName } from "./jobs/dispatcher";

export async function enqueueJob<Name extends JobName>(
  name: Name,
  data: JobData[Name],
  options?: JobsOptions,
) {
  return produceJob(name, (metadata) =>
    defaultQueue.add(name, data, {
      ...options,
      telemetry: {
        ...options?.telemetry,
        metadata: options?.telemetry?.omitContext ? undefined : metadata,
      },
    }),
  );
}

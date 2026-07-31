import type { JobsOptions } from "bullmq";
import { defaultQueue } from "./queues";
import type { JobData, JobName } from "./jobs/dispatcher";

export function enqueueJob<Name extends JobName>(
  name: Name,
  data: JobData[Name],
  options?: JobsOptions,
) {
  return defaultQueue.add(name, data, options);
}

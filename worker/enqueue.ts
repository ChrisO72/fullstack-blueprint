import type { JobsOptions } from "bullmq";
import { createLogger } from "~/observability/logger.server";
import { defaultQueue } from "./queues";
import type { JobData, JobName } from "./jobs/dispatcher";

const logger = createLogger("queue");

export async function enqueueJob<Name extends JobName>(
  name: Name,
  data: JobData[Name],
  options?: JobsOptions,
) {
  try {
    return await defaultQueue.add(name, data, options);
  } catch (error) {
    logger.error("queue.job.enqueue_failed", error, {
      jobName: name,
      jobId: options?.jobId,
    });
    throw error;
  }
}

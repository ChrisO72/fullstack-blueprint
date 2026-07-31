import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import type { JobData, JobName } from "./jobs/dispatcher";

export const defaultQueue = new Queue<JobData[JobName], void, JobName>("default", {
  connection: redisConnection,
});

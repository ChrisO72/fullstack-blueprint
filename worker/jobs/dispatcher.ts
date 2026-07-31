import type { Job } from "bullmq";
import { exampleJobName, handleExampleJob, type ExampleJobData } from "./example";

export type JobData = {
  [exampleJobName]: ExampleJobData;
};

export type JobName = keyof JobData;

type TypedJob = {
  [Name in JobName]: Job<JobData[Name], void, Name>;
}[JobName];

export async function processJob(job: Job<JobData[JobName], void, JobName>) {
  console.log(`[Worker] Processing ${job.name}`, job.data);

  const typedJob = job as TypedJob;
  switch (typedJob.name) {
    case exampleJobName:
      await handleExampleJob(typedJob.data);
      break;
    default:
      throw new Error(`[Worker] Unknown job name: ${job.name}`);
  }
}

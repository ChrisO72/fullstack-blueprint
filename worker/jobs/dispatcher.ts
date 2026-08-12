import type { Job } from "bullmq";
import { createLogger, runWithLogContext } from "~/observability/logger.server";
import {
  expirePendingFileUploadJobName,
  handleExpirePendingFileUploadJob,
  type ExpirePendingFileUploadJobData,
} from "./expire-pending-file-upload";
import {
  handleSendConfirmationEmailJob,
  sendConfirmationEmailJobName,
  type SendConfirmationEmailJobData,
} from "./send-confirmation-email";
import {
  handleSendPasswordResetEmailJob,
  sendPasswordResetEmailJobName,
  type SendPasswordResetEmailJobData,
} from "./send-password-reset-email";

const logger = createLogger("worker");

export type JobData = {
  [expirePendingFileUploadJobName]: ExpirePendingFileUploadJobData;
  [sendConfirmationEmailJobName]: SendConfirmationEmailJobData;
  [sendPasswordResetEmailJobName]: SendPasswordResetEmailJobData;
};

export type JobName = keyof JobData;

type TypedJob = {
  [Name in JobName]: Job<JobData[Name], void, Name>;
}[JobName];

export async function processJob(job: Job<JobData[JobName], void, JobName>) {
  const jobId = String(job.id ?? "unknown");
  const attempt = job.attemptsMade + 1;
  const processedOn = job.processedOn ?? Date.now();
  const queueWaitMs = Math.max(0, processedOn - job.timestamp - (job.opts.delay ?? 0));

  return runWithLogContext({ jobId, jobName: job.name, attempt }, async () => {
    logger.info("queue.job.started", {
      queueWaitMs,
      queuedAt: new Date(job.timestamp).toISOString(),
      processingStartedAt: new Date(processedOn).toISOString(),
    });

    const typedJob = job as TypedJob;
    switch (typedJob.name) {
      case expirePendingFileUploadJobName:
        await handleExpirePendingFileUploadJob(typedJob.data);
        break;
      case sendConfirmationEmailJobName:
        await handleSendConfirmationEmailJob(typedJob.data);
        break;
      case sendPasswordResetEmailJobName:
        await handleSendPasswordResetEmailJob(typedJob.data);
        break;
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  });
}

import type { Job } from "bullmq";
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
  console.log("[Worker] Processing job", {
    name: job.name,
    id: job.id,
    attempt: job.attemptsMade + 1,
    queuedAt: new Date(job.timestamp).toISOString(),
    processingStartedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
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
      throw new Error(`[Worker] Unknown job name: ${job.name}`);
  }
}

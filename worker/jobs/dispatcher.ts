import type { Job } from "bullmq";
import {
  expirePendingFileUploadJobName,
  handleExpirePendingFileUploadJob,
  type ExpirePendingFileUploadJobData,
} from "./expire-pending-file-upload";
import { exampleJobName, handleExampleJob, type ExampleJobData } from "./example";
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
  [exampleJobName]: ExampleJobData;
  [sendConfirmationEmailJobName]: SendConfirmationEmailJobData;
  [sendPasswordResetEmailJobName]: SendPasswordResetEmailJobData;
};

export type JobName = keyof JobData;

type TypedJob = {
  [Name in JobName]: Job<JobData[Name], void, Name>;
}[JobName];

export async function processJob(job: Job<JobData[JobName], void, JobName>) {
  console.log(`[Worker] Processing ${job.name}`, job.data);

  const typedJob = job as TypedJob;
  switch (typedJob.name) {
    case expirePendingFileUploadJobName:
      await handleExpirePendingFileUploadJob(typedJob.data);
      break;
    case exampleJobName:
      await handleExampleJob(typedJob.data);
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

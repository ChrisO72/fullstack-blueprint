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

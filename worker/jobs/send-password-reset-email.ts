import { createHash } from "node:crypto";
import { sendPasswordResetEmail } from "~/mail/password-reset.server";
import { enqueueJob } from "../enqueue";

export const sendPasswordResetEmailJobName = "sendPasswordResetEmail" as const;

export type SendPasswordResetEmailJobData = {
  to: string;
  token: string;
  expiresInHours: number;
};

export function enqueuePasswordResetEmailJob(data: SendPasswordResetEmailJobData) {
  const tokenDigest = createHash("sha256").update(data.token).digest("hex");

  return enqueueJob(sendPasswordResetEmailJobName, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1_000 },
    jobId: `send-password-reset-email-${tokenDigest}`,
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

export async function handleSendPasswordResetEmailJob(data: SendPasswordResetEmailJobData) {
  await sendPasswordResetEmail(data);
}

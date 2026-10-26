import { safeJobId } from "~/telemetry/queue.server";
import { Worker } from "bullmq";
import { log } from "~/telemetry/log.server";
import { processController } from "~/runtime/process.server";
import { redisConnection } from "./redis";
import { processJob } from "./jobs/dispatcher";
import { startSchedules } from "./schedules/register";

const worker = new Worker("default", processJob, { connection: redisConnection });
processController.registerDrain(async () => {
  await worker.close();
  log.info("Worker stopped");
});
startSchedules();
worker.on("ready", () => log.info("Worker ready", { queueName: worker.name }));
worker.on("stalled", (jobId) => log.warn("Job stalled", { "job.id": safeJobId(jobId) }));
worker.on("error", (error) => log.error("Worker error", error));

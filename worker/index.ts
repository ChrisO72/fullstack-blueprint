import { safeJobId } from "~/observability/sanitize.server";
import { Worker } from "bullmq";
import { log } from "~/observability/log.server";
import { shutdownObservability } from "~/observability/runtime.server";
import { redisConnection } from "./redis";
import { processJob } from "./jobs/dispatcher";
import { startSchedules } from "./schedules/register";

const worker = new Worker("default", processJob, { connection: redisConnection });
let stopping = false;
startSchedules();
worker.on("ready", () => log.info("Worker ready", { queueName: worker.name }));
worker.on("stalled", (jobId) => log.warn("Job stalled", { "job.id": safeJobId(jobId) }));
worker.on("error", (error) => log.error("Worker error", error));

async function shutdown(reason: string, exitCode = 0) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 25_000);
  deadline.unref();
  log.info("Worker stopping", { reason });
  try {
    await worker.close();
    log.info("Worker stopped", { reason, exitCode });
    await shutdownObservability();
  } catch (error) {
    log.error("Worker shutdown failed", error);
    exitCode = 1;
  } finally {
    clearTimeout(deadline);
    process.exit(exitCode);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception", error);
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (error) => {
  log.error("Unhandled rejection", error);
  void shutdown("unhandledRejection", 1);
});

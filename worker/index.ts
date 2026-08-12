import { Worker } from "bullmq";
import { createLogger } from "~/observability/logger.server";
import { redisConnection } from "./redis";
import { processJob } from "./jobs/dispatcher";
import { defaultQueue } from "./queues";
import { startSchedules } from "./schedules/register";

const logger = createLogger("worker");
const worker = new Worker("default", processJob, { connection: redisConnection });
let shutdownPromise: Promise<void> | undefined;

startSchedules();

worker.on("ready", () => {
  logger.info("worker.ready", { queueName: worker.name });
});

worker.on("completed", (job) => {
  const processedOn = job.processedOn ?? job.timestamp;
  const finishedOn = job.finishedOn ?? Date.now();
  logger.info("queue.job.completed", {
    jobId: String(job.id ?? "unknown"),
    jobName: job.name,
    attempt: Math.max(1, job.attemptsMade),
    durationMs: Math.max(0, finishedOn - processedOn),
    queueWaitMs: Math.max(0, processedOn - job.timestamp - (job.opts.delay ?? 0)),
  });
});

worker.on("failed", (job, error) => {
  const attempt = Math.max(1, job?.attemptsMade ?? 1);
  const maxAttempts = job?.opts.attempts ?? 1;
  logger.error("queue.job.failed", error, {
    jobId: String(job?.id ?? "unknown"),
    jobName: job?.name ?? "unknown",
    attempt,
    maxAttempts,
    finalAttempt: attempt >= maxAttempts,
    durationMs: job?.processedOn ? Math.max(0, Date.now() - job.processedOn) : undefined,
  });
});

worker.on("stalled", (jobId) => {
  logger.warn("queue.job.stalled", { jobId });
});

worker.on("error", (error) => {
  logger.error("worker.error", error);
});

function shutdown(reason: string, exitCode = 0): Promise<void> {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info("worker.shutdown.started", { reason, exitCode });

    const results = await Promise.allSettled([worker.close(), defaultQueue.close()]);
    const failures: unknown[] = [];
    for (const result of results) {
      if (result.status === "rejected") failures.push(result.reason);
    }

    if (failures.length > 0) {
      logger.fatal(
        "worker.shutdown.failed",
        new AggregateError(failures, "Failed to close worker resources"),
        { reason },
      );
      process.exitCode = 1;
      setTimeout(() => process.exit(1), 100).unref();
      return;
    }

    logger.info("worker.shutdown.completed", { reason, exitCode });
    process.exitCode = exitCode;
  })();

  return shutdownPromise;
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("uncaughtException", (error) => {
  logger.fatal("worker.uncaught_exception", error);
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal("worker.unhandled_rejection", reason);
  void shutdown("unhandledRejection", 1);
});

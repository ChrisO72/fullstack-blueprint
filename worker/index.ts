import { Worker } from "bullmq";
import { redisConnection } from "./redis";
import { processJob } from "./jobs";
import { startScheduler } from "./scheduler";

new Worker("default", processJob, { connection: redisConnection });

startScheduler();

console.log("[Worker] Ready");

import cron from "node-cron";
import { enqueueJob } from "../enqueue";
import { exampleJobName } from "../jobs/example";

export function registerExampleSchedule() {
  cron.schedule("* * * * *", async () => {
    await enqueueJob(exampleJobName, { message: "scheduled ping" });
  });
}

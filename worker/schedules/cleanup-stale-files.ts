import cron from "node-cron";
import { listOrganizations } from "~/db/repositories/organizations";
import { enqueueJob } from "../enqueue";
import { cleanupStaleFilesJobName } from "../jobs/cleanup-stale-files";

const STALE_AFTER_HOURS = 24;

export function registerCleanupStaleFilesSchedule() {
  cron.schedule("0 3 * * *", async () => {
    try {
      const organizations = await listOrganizations();
      const createdBefore = new Date(Date.now() - STALE_AFTER_HOURS * 60 * 60 * 1000);
      const scheduleDate = new Date().toISOString().slice(0, 10);

      await Promise.all(
        organizations.map((organization) =>
          enqueueJob(
            cleanupStaleFilesJobName,
            {
              organizationId: organization.id,
              createdBefore: createdBefore.toISOString(),
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 1_000 },
              jobId: `cleanup-stale-files-${organization.id}-${scheduleDate}`,
              removeOnComplete: 100,
              removeOnFail: 100,
            },
          ),
        ),
      );
    } catch (error) {
      console.error("[Scheduler] Failed to enqueue stale file cleanup", error);
    }
  });
}

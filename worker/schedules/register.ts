import { registerCleanupStaleFilesSchedule } from "./cleanup-stale-files";
import { registerExampleSchedule } from "./example";

export function startSchedules() {
  registerCleanupStaleFilesSchedule();
  registerExampleSchedule();
  console.log("[Scheduler] Cron jobs registered");
}

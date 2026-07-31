import { registerExampleSchedule } from "./example";

export function startSchedules() {
  registerExampleSchedule();
  console.log("[Scheduler] Cron jobs registered");
}

import { listStalePendingFilesByOrg, markFileFailed } from "~/db/repositories/files";
import { deleteStoredFile } from "~/storage/objects.server";

export const cleanupStaleFilesJobName = "cleanupStaleFiles" as const;

export type CleanupStaleFilesJobData = {
  organizationId: number;
  createdBefore: string;
};

const BATCH_SIZE = 100;

export async function handleCleanupStaleFilesJob(data: CleanupStaleFilesJobData) {
  const createdBefore = new Date(data.createdBefore);
  if (Number.isNaN(createdBefore.getTime())) {
    throw new Error("Invalid stale-file cleanup cutoff");
  }

  let cleanedCount = 0;

  while (true) {
    const staleFiles = await listStalePendingFilesByOrg(
      data.organizationId,
      createdBefore,
      BATCH_SIZE,
    );
    if (staleFiles.length === 0) break;

    for (const file of staleFiles) {
      await deleteStoredFile(file.storageKey);
      await markFileFailed(file.id, data.organizationId);
      cleanedCount += 1;
    }
  }

  console.log(
    `[Worker] Cleaned ${cleanedCount} stale file upload(s) for organization ${data.organizationId}`,
  );
}

import { getFileById, markFileFailed } from "~/db/repositories/files";
import { log } from "~/observability/log.server";
import { deleteStoredFile } from "~/storage/objects.server";

export const expirePendingFileUploadJobName = "expirePendingFileUpload" as const;
export const PENDING_FILE_UPLOAD_TTL_MS = 30 * 60 * 1000;

export type ExpirePendingFileUploadJobData = {
  organizationId: number;
  fileId: number;
};

export async function handleExpirePendingFileUploadJob(data: ExpirePendingFileUploadJobData) {
  const claimedFile = await markFileFailed(data.fileId, data.organizationId);

  if (claimedFile) {
    await deleteStoredFile(claimedFile.storageKey);
    log.info("Pending upload expired", { fileId: data.fileId });
    return;
  }

  const file = await getFileById(data.fileId, data.organizationId);
  if (!file || file.status !== "failed") return;

  // A retry may find the metadata already failed if object deletion previously threw.
  await deleteStoredFile(file.storageKey);
  log.info("Failed upload removed", { fileId: data.fileId });
}

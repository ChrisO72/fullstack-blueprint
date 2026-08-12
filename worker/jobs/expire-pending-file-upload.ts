import { getFileById, markFileFailed } from "~/db/repositories/files";
import { createLogger } from "~/observability/logger.server";
import { deleteStoredFile } from "~/storage/objects.server";

const logger = createLogger("worker");

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
    logger.info("file.pending_upload.expired", { fileId: data.fileId });
    return;
  }

  const file = await getFileById(data.fileId, data.organizationId);
  if (!file || file.status !== "failed") return;

  // A retry may find the metadata already failed if object deletion previously threw.
  await deleteStoredFile(file.storageKey);
  logger.info("file.failed_upload.object_removed", { fileId: data.fileId });
}

import { getFileById, markFileFailed } from "~/db/repositories/files";
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
    console.log(`[Worker] Expired pending file upload ${data.fileId}`);
    return;
  }

  const file = await getFileById(data.fileId, data.organizationId);
  if (!file || file.status !== "failed") return;

  // A retry may find the metadata already failed if object deletion previously threw.
  await deleteStoredFile(file.storageKey);
  console.log(`[Worker] Removed object for failed file upload ${data.fileId}`);
}

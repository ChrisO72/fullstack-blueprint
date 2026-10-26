import { getFileForCleanup, markFileFailed } from "~/db/repositories/files";
import { log } from "~/telemetry/log.server";
import { deleteStoredFile } from "~/storage/objects.server";

export const expirePendingFileUploadJobName = "expirePendingFileUpload" as const;
export const PENDING_FILE_UPLOAD_TTL_MS = 30 * 60 * 1000;

export type ExpirePendingFileUploadJobData = {
  organizationId: number;
  fileId: number;
};

export async function handleExpirePendingFileUploadJob(data: ExpirePendingFileUploadJobData) {
  await markFileFailed(data.fileId, data.organizationId);
  const file = await getFileForCleanup(data.fileId, data.organizationId);
  if (!file) return;

  await deleteStoredFile(file.storageKey);
  log.info("Upload object removed", { fileId: data.fileId });
}

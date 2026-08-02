import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { env } from "~/env.server";
import { storageClient } from "./client.server";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 5 * 60;

export function createStorageKey(organizationId: number) {
  return `organizations/${organizationId}/files/${randomUUID()}`;
}

export async function createFileUpload(
  storageKey: string,
  contentType: string,
  expectedSize: number,
) {
  return createPresignedPost(storageClient, {
    Bucket: env.S3_BUCKET,
    Key: storageKey,
    Expires: SIGNED_URL_TTL_SECONDS,
    Fields: {
      "Content-Type": contentType,
    },
    Conditions: [
      ["eq", "$Content-Type", contentType],
      ["content-length-range", expectedSize, expectedSize],
    ],
  });
}

export async function inspectStoredFile(storageKey: string) {
  const object = await storageClient.send(
    new HeadObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
    }),
  );

  return {
    contentType: object.ContentType,
    size: object.ContentLength,
  };
}

export async function createFileDownloadUrl(storageKey: string, filename: string) {
  const contentDisposition = createAttachmentDisposition(filename);

  return getSignedUrl(
    storageClient,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      ResponseContentDisposition: contentDisposition,
      ResponseContentType: "application/octet-stream",
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

export async function deleteStoredFile(storageKey: string) {
  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
    }),
  );
}

function createAttachmentDisposition(filename: string) {
  const safeFilename = filename.replaceAll(/[\r\n"\\]/g, "_");
  const asciiFilename = safeFilename.replaceAll(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`;
}

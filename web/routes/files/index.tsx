import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import { redirect, useActionData, useSubmit } from "react-router";
import { z } from "zod";
import { FormError } from "~/components/form-error";
import { Badge } from "~/components/ui-kit/badge";
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "~/components/ui-kit/dropdown";
import { Heading } from "~/components/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui-kit/table";
import {
  countFilesByOrg,
  createFile,
  getFileById,
  listFilesByOrgPaginated,
  markFileFailed,
  markFileReady,
  softDeleteFile,
} from "~/db/repositories/files";
import { type ActionData, parseForm } from "~/lib/form";
import { getAuthenticatedUser } from "~/lib/session.server";
import {
  createFileUpload,
  createStorageKey,
  deleteStoredFile,
  inspectStoredFile,
  isFileStorageEnabled,
  MAX_UPLOAD_BYTES,
} from "~/storage/objects.server";
import { createLogger } from "~/observability/logger.server";
import { enqueueJob } from "~/worker/enqueue";
import {
  expirePendingFileUploadJobName,
  PENDING_FILE_UPLOAD_TTL_MS,
} from "~/worker/jobs/expire-pending-file-upload";
import type { Route } from "./+types/index";
import { Pagination } from "../items/Pagination";
import { UploadFileDialog } from "./UploadFileDialog";

const logger = createLogger("web");

const prepareUploadSchema = z.object({
  intent: z.literal("prepare"),
  filename: z.string().trim().min(1, "Filename is required").max(255, "Filename is too long"),
  contentType: z.string().trim().min(1).max(255),
  size: z.coerce
    .number()
    .int()
    .min(1, "The file is empty")
    .max(MAX_UPLOAD_BYTES, "Files must be 25 MB or smaller"),
});

const fileIdSchema = z.object({
  intent: z.enum(["confirm", "fail"]),
  fileId: z.coerce.number({ message: "Invalid file ID" }).int().positive("Invalid file ID"),
});

const deleteFileSchema = z.object({
  id: z.coerce.number({ message: "Invalid file ID" }).int().positive("Invalid file ID"),
});

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

type PreparedUpload = {
  fileId: number;
  url: string;
  fields: Record<string, string>;
};

export type FileActionData = ActionData & {
  intent?: "prepare" | "confirm" | "fail" | "delete";
  prepared?: PreparedUpload;
  success?: boolean;
  fileId?: number;
};

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = getAuthenticatedUser(context);
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const requestedPageSize = parseInt(url.searchParams.get("pageSize") ?? "", 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  if (!isFileStorageEnabled) {
    return {
      storageEnabled: false,
      files: [],
      page,
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      totalCount: 0,
      totalPages: 0,
    };
  }

  const [files, totalCount] = await Promise.all([
    listFilesByOrgPaginated(user.organizationId, page, pageSize),
    countFilesByOrg(user.organizationId),
  ]);

  return {
    storageEnabled: true,
    files,
    page,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<FileActionData | Response> {
  const user = getAuthenticatedUser(context);

  if (!isFileStorageEnabled) {
    return { formError: "Add S3 environment variables to enable files." };
  }

  const formData = await request.formData();

  if (request.method === "DELETE") {
    const { data, fieldErrors } = parseForm(formData, deleteFileSchema);
    if (fieldErrors) return { intent: "delete", fieldErrors };

    const file = await getFileById(data.id, user.organizationId);
    if (file) {
      try {
        await deleteStoredFile(file.storageKey);
        await softDeleteFile(file.id, user.organizationId);
      } catch (error) {
        logger.error("file.delete.failed", error, { fileId: file.id });
        return { intent: "delete", formError: "The file could not be deleted. Please try again." };
      }
    }

    const url = new URL(request.url);
    return redirect(url.search ? `.${url.search}` : ".");
  }

  const intent = formData.get("intent");
  if (intent === "prepare") {
    const { data, fieldErrors } = parseForm(formData, prepareUploadSchema);
    if (fieldErrors) return { intent, fieldErrors };

    const storageKey = createStorageKey(user.organizationId);
    const file = await createFile({
      organizationId: user.organizationId,
      uploadedByUserId: user.id,
      storageKey,
      originalFilename: data.filename,
      contentType: data.contentType,
      expectedSize: data.size,
    });

    if (!file) {
      return { intent, formError: "The upload could not be prepared. Please try again." };
    }

    try {
      const upload = await createFileUpload(storageKey, data.contentType, data.size);
      await enqueueJob(
        expirePendingFileUploadJobName,
        {
          organizationId: user.organizationId,
          fileId: file.id,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1_000 },
          delay: PENDING_FILE_UPLOAD_TTL_MS,
          jobId: `expire-file-upload-${file.id}`,
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      );
      return {
        intent,
        prepared: {
          fileId: file.id,
          url: upload.url,
          fields: upload.fields,
        },
      };
    } catch (error) {
      logger.error("file.prepare.failed", error, { fileId: file.id });
      await markFileFailed(file.id, user.organizationId);
      return { intent, formError: "The upload could not be prepared. Please try again." };
    }
  }

  if (intent === "confirm" || intent === "fail") {
    const { data, fieldErrors } = parseForm(formData, fileIdSchema);
    if (fieldErrors) return { intent, fieldErrors };

    const file = await getFileById(data.fileId, user.organizationId);
    if (!file || file.status !== "pending") {
      return { intent, formError: "This upload is no longer pending.", fileId: data.fileId };
    }

    if (intent === "fail") {
      await markFileFailed(file.id, user.organizationId);
      return { intent, success: true, fileId: file.id };
    }

    try {
      const storedFile = await inspectStoredFile(file.storageKey);
      if (storedFile.size !== file.expectedSize || storedFile.contentType !== file.contentType) {
        await deleteStoredFile(file.storageKey);
        await markFileFailed(file.id, user.organizationId);
        return {
          intent,
          formError: "The uploaded file did not match the expected metadata.",
          fileId: file.id,
        };
      }

      const readyFile = await markFileReady(file.id, user.organizationId, storedFile.size);
      if (!readyFile) {
        return {
          intent,
          formError: "This upload is no longer pending.",
          fileId: file.id,
        };
      }

      return { intent, success: true, fileId: file.id };
    } catch (error) {
      logger.error("file.confirm.failed", error, { fileId: file.id });
      return {
        intent,
        formError: "The uploaded file could not be verified. Please try again.",
        fileId: file.id,
      };
    }
  }

  return { formError: "Unknown file action." };
}

export default function FilesPage({ loaderData }: Route.ComponentProps) {
  if (!loaderData.storageEnabled) {
    return (
      <div>
        <Heading>Files</Heading>
        <div className="mt-6 rounded-lg bg-zinc-50 px-6 py-12 text-center dark:bg-zinc-900">
          <p className="font-medium text-zinc-950 dark:text-white">
            File storage is not configured.
          </p>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Add S3 environment variables to enable files.
          </p>
        </div>
      </div>
    );
  }

  const { files, page, pageSize, pageSizeOptions, totalCount, totalPages } = loaderData;
  const actionData = useActionData<FileActionData>();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <div className="mb-6 flex shrink-0 items-start justify-between gap-4">
        <Heading>
          Files
          {totalCount > 0 && (
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              ({totalCount} total)
            </span>
          )}
        </Heading>
        <UploadFileDialog />
      </div>

      <FormError actionData={actionData} />

      {files.length === 0 ? (
        <div className="mt-4 rounded-lg bg-zinc-50 py-12 text-center dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">No files uploaded yet.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Size</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Uploaded</TableHeader>
                  <TableHeader>
                    <span className="sr-only">Actions</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <FileThumbnail
                          fileId={file.id}
                          filename={file.originalFilename}
                          isImage={file.contentType.startsWith("image/")}
                          ready={file.status === "ready"}
                        />
                        <span>{file.originalFilename}</span>
                      </div>
                    </TableCell>
                    <TableCell>{file.contentType}</TableCell>
                    <TableCell>{formatFileSize(file.actualSize ?? file.expectedSize)}</TableCell>
                    <TableCell>
                      <FileStatus status={file.status} />
                    </TableCell>
                    <TableCell>{new Date(file.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <FileActions fileId={file.id} ready={file.status === "ready"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="shrink-0">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              limit={pageSize}
              pageSizeOptions={pageSizeOptions}
            />
          </div>
        </>
      )}
    </div>
  );
}

function FileThumbnail({
  fileId,
  filename,
  isImage,
  ready,
}: {
  fileId: number;
  filename: string;
  isImage: boolean;
  ready: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (isImage && ready && !imageFailed) {
    return (
      <img
        src={`/files/${fileId}/preview`}
        alt=""
        className="size-10 shrink-0 rounded-md bg-zinc-100 object-cover dark:bg-zinc-800"
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  const extension = getFileExtension(filename);
  return (
    <span
      aria-hidden="true"
      title={extension}
      className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-500 uppercase dark:bg-zinc-800 dark:text-zinc-400"
    >
      <span className="max-w-full truncate">{extension}</span>
    </span>
  );
}

function FileStatus({ status }: { status: "pending" | "ready" | "failed" }) {
  const colors = { pending: "zinc", ready: "green", failed: "red" } as const;
  return <Badge color={colors[status]}>{status}</Badge>;
}

function FileActions({ fileId, ready }: { fileId: number; ready: boolean }) {
  const submit = useSubmit();

  const handleDelete = () => {
    const formData = new FormData();
    formData.set("id", fileId.toString());
    submit(formData, { method: "DELETE" });
  };

  return (
    <Dropdown>
      <DropdownButton plain aria-label="File actions">
        <EllipsisHorizontalIcon data-slot="icon" />
      </DropdownButton>
      <DropdownMenu anchor="bottom end">
        {ready && <DropdownItem href={`/files/${fileId}/download`}>Download</DropdownItem>}
        <DropdownItem onClick={handleDelete}>Delete</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === filename.length - 1) return "FILE";
  return filename.slice(lastDot).toLowerCase();
}

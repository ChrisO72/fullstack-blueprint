import { redirect } from "react-router";
import { z } from "zod";
import { getFileById } from "~/db/repositories/files";
import { getAuthenticatedUser } from "~/lib/session.server";
import { createFilePreviewUrl, isFileStorageEnabled } from "~/storage/objects.server";
import type { Route } from "./+types/preview";

const paramsSchema = z.object({
  fileId: z.coerce.number().int().positive(),
});

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = getAuthenticatedUser(context);
  if (!isFileStorageEnabled) {
    throw new Response("File storage is not configured", { status: 503 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw new Response("Not found", { status: 404 });
  }

  const file = await getFileById(parsedParams.data.fileId, user.organizationId);
  if (!file || file.status !== "ready" || !file.contentType.startsWith("image/")) {
    throw new Response("Not found", { status: 404 });
  }

  const previewUrl = await createFilePreviewUrl(file.storageKey, file.contentType);
  return redirect(previewUrl);
}

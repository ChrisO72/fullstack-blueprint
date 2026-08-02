import { redirect } from "react-router";
import { z } from "zod";
import { getFileById } from "~/db/repositories/files";
import { getAuthenticatedUser } from "~/lib/session.server";
import { createFileDownloadUrl } from "~/storage/objects.server";
import type { Route } from "./+types/download";

const paramsSchema = z.object({
  fileId: z.coerce.number().int().positive(),
});

export async function loader({ params, context }: Route.LoaderArgs) {
  const user = getAuthenticatedUser(context);
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw new Response("Not found", { status: 404 });
  }

  const file = await getFileById(parsedParams.data.fileId, user.organizationId);
  if (!file || file.status !== "ready") {
    throw new Response("Not found", { status: 404 });
  }

  const downloadUrl = await createFileDownloadUrl(file.storageKey, file.originalFilename);
  return redirect(downloadUrl);
}

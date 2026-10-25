import { and, count, desc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { type InsertFile, files } from "../schema/files";

export async function createFile(file: InsertFile) {
  const [createdFile] = await db.insert(files).values(file).returning();
  return createdFile ?? null;
}

export async function getFileById(id: number, organizationId: number) {
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.organizationId, organizationId), isNull(files.deletedAt)))
    .limit(1);
  return file ?? null;
}

// Worker cleanup must retain access to tombstones after their signed uploads expire.
export async function getFileForCleanup(
  id: number,
  organizationId: number,
): Promise<{ storageKey: string } | null> {
  const [file] = await db
    .select({ storageKey: files.storageKey })
    .from(files)
    .where(
      and(
        eq(files.id, id),
        eq(files.organizationId, organizationId),
        or(isNotNull(files.deletedAt), eq(files.status, "failed")),
      ),
    )
    .limit(1);
  return file ?? null;
}

export async function markFileReady(id: number, organizationId: number, actualSize: number) {
  const [file] = await db
    .update(files)
    .set({ actualSize, status: "ready" })
    .where(
      and(
        eq(files.id, id),
        eq(files.organizationId, organizationId),
        eq(files.status, "pending"),
        isNull(files.deletedAt),
      ),
    )
    .returning();
  return file ?? null;
}

export async function markFileFailed(id: number, organizationId: number) {
  const [file] = await db
    .update(files)
    .set({ status: "failed" })
    .where(
      and(
        eq(files.id, id),
        eq(files.organizationId, organizationId),
        eq(files.status, "pending"),
        isNull(files.deletedAt),
      ),
    )
    .returning();
  return file ?? null;
}

export async function softDeleteFile(id: number, organizationId: number) {
  const [file] = await db
    .update(files)
    .set({ deletedAt: new Date() })
    .where(and(eq(files.id, id), eq(files.organizationId, organizationId), isNull(files.deletedAt)))
    .returning();
  return file ?? null;
}

export async function listFilesByOrgPaginated(organizationId: number, page: number, limit: number) {
  return await db
    .select()
    .from(files)
    .where(and(eq(files.organizationId, organizationId), isNull(files.deletedAt)))
    .orderBy(desc(files.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

export async function countFilesByOrg(organizationId: number) {
  const [result] = await db
    .select({ count: count() })
    .from(files)
    .where(and(eq(files.organizationId, organizationId), isNull(files.deletedAt)));
  return result?.count ?? 0;
}

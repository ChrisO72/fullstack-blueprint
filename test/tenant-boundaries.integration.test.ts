import { describe, expect, it } from "vitest";
import { createFile, markFileFailed, markFileReady } from "~/db/repositories/files";
import { createItem, getItemById, softDeleteItem, updateItem } from "~/db/repositories/items";
import { createTestOrganization } from "./fixtures";

describe("organization boundaries", () => {
  it("prevents another organization from reading or mutating an item", async () => {
    const owner = await createTestOrganization("Item owner");
    const outsider = await createTestOrganization("Item outsider");
    const [item] = await createItem({ organizationId: owner.id, title: "Private item" });
    if (!item) throw new Error("Failed to create test item");

    expect(await getItemById(item.id, outsider.id)).toBeNull();
    expect(await updateItem(item.id, outsider.id, { title: "Stolen item" })).toEqual([]);
    expect(await softDeleteItem(item.id, outsider.id)).toEqual([]);
    expect(await getItemById(item.id, owner.id)).toMatchObject({ title: "Private item" });
  });

  it("enforces organization ownership and terminal file states", async () => {
    const owner = await createTestOrganization("File owner");
    const outsider = await createTestOrganization("File outsider");
    const readyFile = await createFile({
      organizationId: owner.id,
      storageKey: "tests/ready-file",
      originalFilename: "ready.txt",
      contentType: "text/plain",
      expectedSize: 5,
    });
    const failedFile = await createFile({
      organizationId: owner.id,
      storageKey: "tests/failed-file",
      originalFilename: "failed.txt",
      contentType: "text/plain",
      expectedSize: 6,
    });
    if (!readyFile || !failedFile) throw new Error("Failed to create test files");

    expect(await markFileReady(readyFile.id, outsider.id, 5)).toBeNull();
    expect(await markFileReady(readyFile.id, owner.id, 5)).toMatchObject({ status: "ready" });
    expect(await markFileFailed(readyFile.id, owner.id)).toBeNull();

    expect(await markFileFailed(failedFile.id, owner.id)).toMatchObject({ status: "failed" });
    expect(await markFileReady(failedFile.id, owner.id, 6)).toBeNull();
  });
});

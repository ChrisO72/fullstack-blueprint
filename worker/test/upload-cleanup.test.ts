import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFileForCleanup, markFileFailed } from "~/db/repositories/files";
import { deleteStoredFile } from "~/storage/objects.server";
import { handleExpirePendingFileUploadJob } from "../jobs/expire-pending-file-upload";

vi.mock("~/db/repositories/files", () => ({ markFileFailed: vi.fn(), getFileForCleanup: vi.fn() }));
vi.mock("~/storage/objects.server", () => ({ deleteStoredFile: vi.fn() }));
vi.mock("~/telemetry/log.server", () => ({ log: { info: vi.fn() } }));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("upload cleanup", () => {
  it("removes a late object using the deleted upload's retained storage key", async () => {
    vi.mocked(getFileForCleanup).mockResolvedValue({ storageKey: "organizations/7/files/deleted" });
    await handleExpirePendingFileUploadJob({ organizationId: 7, fileId: 42 });
    expect(markFileFailed).toHaveBeenCalledWith(42, 7);
    expect(getFileForCleanup).toHaveBeenCalledWith(42, 7);
    expect(deleteStoredFile).toHaveBeenCalledWith("organizations/7/files/deleted");
  });

  it("leaves objects alone when the repository finds no eligible file", async () => {
    vi.mocked(getFileForCleanup).mockResolvedValue(null);
    await handleExpirePendingFileUploadJob({ organizationId: 7, fileId: 42 });
    expect(deleteStoredFile).not.toHaveBeenCalled();
  });

  it("allows failed object deletion to be retried", async () => {
    vi.mocked(getFileForCleanup).mockResolvedValue({ storageKey: "organizations/7/files/failed" });
    vi.mocked(deleteStoredFile)
      .mockRejectedValueOnce(new Error("Storage unavailable"))
      .mockResolvedValueOnce(undefined);
    const data = { organizationId: 7, fileId: 42 };
    await expect(handleExpirePendingFileUploadJob(data)).rejects.toThrow("Storage unavailable");
    await expect(handleExpirePendingFileUploadJob(data)).resolves.toBeUndefined();
    expect(deleteStoredFile).toHaveBeenCalledTimes(2);
  });
});

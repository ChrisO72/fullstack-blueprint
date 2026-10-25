import { describe, expect, it, vi } from "vitest";
import { createProcessController } from "../process.server";

describe("process shutdown", () => {
  it("waits for application work before closing resources and exiting", async () => {
    let finishDrain = () => {};
    let finishShutdown = () => {};
    const drained = new Promise<void>((resolve) => {
      finishDrain = resolve;
    });
    const closed = new Promise<void>((resolve) => {
      finishShutdown = resolve;
    });
    const shutdown = vi.fn(() => closed);
    const exit = vi.fn();
    const controller = createProcessController({ shutdown, exit, report: vi.fn() });
    controller.registerDrain(() => drained);

    const stopping = controller.stop();
    expect(controller.stop()).toBe(stopping);
    expect(shutdown).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();

    finishDrain();
    await Promise.resolve();
    expect(shutdown).toHaveBeenCalledOnce();
    expect(exit).not.toHaveBeenCalled();

    finishShutdown();
    await stopping;
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("still closes resources and exits nonzero if draining fails", async () => {
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();
    const report = vi.fn();
    const error = new Error("Drain failed");
    const controller = createProcessController({ shutdown, exit, report });
    controller.registerDrain(() => Promise.reject(error));

    await controller.stop();
    expect(report).toHaveBeenCalledWith("Application drain failed", error);
    expect(shutdown).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });
});

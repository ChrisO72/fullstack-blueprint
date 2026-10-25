import { log } from "../telemetry/log.server.ts";
import { shutdown } from "../telemetry/shutdown.server.ts";

type ProcessDependencies = {
  shutdown: () => Promise<unknown>;
  report: (message: string, error: unknown) => void;
  exit: (code: number) => void;
};

export function createProcessController(dependencies: ProcessDependencies) {
  let drain = async () => {};
  let stopping: Promise<void> | undefined;
  let exitCode = 0;
  return {
    registerDrain(callback: () => Promise<void>) {
      drain = callback;
    },
    stop(code = 0): Promise<void> {
      // A fatal error during an existing graceful shutdown must still fail the process.
      exitCode = Math.max(exitCode, code);
      return (stopping ??= (async () => {
        const deadline = setTimeout(() => dependencies.exit(1), 25_000);
        deadline.unref();
        try {
          await drain();
        } catch (error) {
          exitCode = 1;
          dependencies.report("Application drain failed", error);
        } finally {
          try {
            await dependencies.shutdown();
          } catch {
            exitCode = 1;
          }
          clearTimeout(deadline);
          dependencies.exit(exitCode);
        }
      })());
    },
  };
}

// Preload and bundled application code share the same controller.
const shared = globalThis as typeof globalThis & {
  __blueprintProcess?: ReturnType<typeof createProcessController>;
  __blueprintProcessHandlers?: boolean;
};
export const processController = (shared.__blueprintProcess ??= createProcessController({
  shutdown,
  report: log.error,
  exit: (code) => process.exit(code),
}));

export function installProcessHandlers(worker: boolean) {
  if (shared.__blueprintProcessHandlers) return;
  shared.__blueprintProcessHandlers = true;
  for (const event of ["uncaughtException", "unhandledRejection"] as const) {
    process.on(event, (error: unknown) => {
      log.error(event, error);
      void processController.stop(1);
    });
  }
  // Vite owns development web signals; production registers its HTTP drain on the controller.
  if (worker || process.env.NODE_ENV === "production") {
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
      process.on(signal, () => {
        log.info("Application stopping", { reason: signal });
        void processController.stop();
      });
    }
  }
}

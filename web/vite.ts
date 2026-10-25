import type { Plugin } from "vite";
import { shutdown } from "../telemetry/shutdown.server.ts";
import { processController } from "../runtime/process.server.ts";

// Vite owns its HTTP server and signal handlers; finish cleanup before its exit.
export function applicationShutdown(): Plugin {
  return {
    name: "application-shutdown",
    configureServer(server) {
      let stopping = false;
      const onSignal = () => {
        if (stopping) return;
        stopping = true;
        setTimeout(() => process.exit(1), 25_000).unref();
        void server.close().then(
          () => processController.stop(),
          () => processController.stop(1),
        );
      };
      process.prependOnceListener("SIGTERM", onSignal);
      process.prependOnceListener("SIGINT", onSignal);
      const close = server.close.bind(server);
      server.close = async () => {
        try {
          await close();
        } finally {
          process.removeListener("SIGTERM", onSignal);
          process.removeListener("SIGINT", onSignal);
          // A Vite config reload also closes the server; keep the SDK alive then.
          if (stopping) await shutdown();
        }
      };
    },
  };
}

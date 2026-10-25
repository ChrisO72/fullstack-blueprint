import type { Plugin } from "vite";
import { shutdownTelemetry } from "./runtime.server.ts";

// Vite owns its HTTP server and signal handlers; finish cleanup before its exit.
export function telemetryShutdown(): Plugin {
  return {
    name: "telemetry-shutdown",
    configureServer(server) {
      let stopping = false;
      const onSignal = () => {
        if (stopping) return;
        stopping = true;
        setTimeout(() => process.exit(1), 25_000).unref();
        void server.close().then(
          () => process.exit(0),
          () => process.exit(1),
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
          if (stopping) await shutdownTelemetry();
        }
      };
    },
  };
}

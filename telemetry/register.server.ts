import * as Sentry from "@sentry/react-router";
import { init as initNode } from "@sentry/node";
import { config, environment, release } from "./config.server";
import { serverDsn } from "./config";
import { privacyOptions } from "./redact";
import { installProcessHandlers } from "../runtime/process.server";

const worker = process.env.SENTRY_SERVICE === "worker";
if (process.env.NODE_ENV !== "test" && config.SENTRY_DSN && !Sentry.isInitialized()) {
  const init = worker ? initNode : Sentry.init;
  init({
    ...privacyOptions,
    dsn: serverDsn(config),
    environment,
    release,
    tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
    includeLocalVariables: false,
    initialScope: {
      tags: { service: worker ? "worker" : "web", runtime: "node" },
      attributes: { service: worker ? "worker" : "web", runtime: "node" },
    },
    integrations: (defaults) =>
      defaults.filter(
        (integration) =>
          !["LocalVariables", "Dedupe", "OnUncaughtException", "OnUnhandledRejection"].includes(
            integration.name,
          ),
      ),
  });
}
if (process.env.NODE_ENV !== "test") installProcessHandlers(Boolean(worker));

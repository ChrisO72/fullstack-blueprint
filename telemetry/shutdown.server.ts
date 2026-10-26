import * as Sentry from "@sentry/node";
import { lifecycle } from "../runtime/lifecycle.server.ts";
export const shutdown = () => lifecycle.shutdown(() => Sentry.close(2000));

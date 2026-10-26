import * as Sentry from "@sentry/react-router";
import { isRouteErrorResponse, type ServerInstrumentation } from "react-router";
import { log } from "./log.server";

export function shouldReportRequestError(error: unknown, aborted = false): boolean {
  return (
    !aborted && !((isRouteErrorResponse(error) || error instanceof Response) && error.status < 500)
  );
}

export const instrumentations: ServerInstrumentation[] = [
  Sentry.createSentryServerInstrumentation({ captureErrors: false }),
  {
    handler({ instrument }) {
      instrument({
        async request(handleRequest, { request }) {
          const start = performance.now();
          let route = "unmatched";
          let status = 500;
          try {
            const result = await handleRequest();
            route = result.meta?.pattern ?? "unmatched";
            status = result.statusCode;
          } finally {
            const attributes = {
              "http.request.method":
                /^(GET|HEAD|POST|PUT|DELETE|CONNECT|OPTIONS|TRACE|PATCH)$/.test(request.method)
                  ? request.method
                  : "_OTHER",
              "http.route": route,
              "http.response.status_code": status,
            };
            Sentry.metrics.count("http.server.requests", 1, { attributes });
            Sentry.metrics.distribution(
              "http.server.request.duration",
              (performance.now() - start) / 1000,
              { unit: "second", attributes },
            );
            log.info("Request completed", attributes);
          }
        },
      });
    },
  },
];

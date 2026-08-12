import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import {
  isRouteErrorResponse,
  ServerRouter,
  type EntryContext,
  type HandleErrorFunction,
  type RouterContextProvider,
  type ServerInstrumentation,
} from "react-router";
import { createLogger } from "~/observability/logger.server";
import { getRequestId } from "./lib/request-context.server";

const logger = createLogger("web");

export const streamTimeout = 5_000;

export const instrumentations: ServerInstrumentation[] = [
  {
    handler({ instrument }) {
      instrument({
        async request(handleRequest, { request, context }) {
          const startedAt = performance.now();
          const result = await handleRequest();
          const fields = {
            requestId: getRequestId(context),
            method: request.method,
            path: new URL(request.url).pathname,
            routePattern: result.meta?.pattern || "unmatched",
            statusCode: result.statusCode,
            durationMs: Math.round(performance.now() - startedAt),
          };

          if (result.statusCode >= 500) {
            logger.warn("http.request.completed", fields);
          } else {
            logger.info("http.request.completed", fields);
          }
        },
      });
    },
  },
];

export const handleError: HandleErrorFunction = (error, { request, context }) => {
  if (
    request.signal.aborted ||
    (isRouteErrorResponse(error) && error.status < 500) ||
    (error instanceof Response && error.status < 500)
  ) {
    return;
  }

  logger.error("http.request.unhandled_error", error, {
    requestId: getRequestId(context),
    method: request.method,
    path: new URL(request.url).pathname,
  });
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1_000,
    );

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            logger.error("http.render.streaming_error", error, {
              requestId: getRequestId(loadContext),
              method: request.method,
              path: new URL(request.url).pathname,
            });
          }
        },
      },
    );
  });
}

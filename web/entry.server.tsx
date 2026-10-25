import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, type EntryContext, type HandleErrorFunction } from "react-router";
import { log } from "~/telemetry/log.server";
import { getMetaTagTransformer, wrapSentryHandleRequest } from "@sentry/react-router";
import { shouldReportRequestError } from "~/telemetry/http.server";
export { instrumentations } from "~/telemetry/http.server";

export const streamTimeout = 5_000;

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (!shouldReportRequestError(error, request.signal.aborted)) return;

  log.error("Unhandled request error", error, {
    "http.request.method": request.method,
  });
};

function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
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
          pipe(getMetaTagTransformer(body));

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
          if (shellRendered && shouldReportRequestError(error, request.signal.aborted)) {
            log.error("Streaming render failed", error, {
              "http.request.method": request.method,
            });
          }
        },
      },
    );
  });
}

export default wrapSentryHandleRequest(async (...args) =>
  handleRequest(args[0], args[1], args[2], args[3]),
);

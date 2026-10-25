import { createRequestHandler } from "@react-router/express";
import compression from "compression";
import express, { type ErrorRequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ServerBuild } from "react-router";
import { processController } from "~/runtime/process.server";
import { log } from "~/telemetry/log.server";
import { env } from "./env.server";

const buildUrl = new URL("./server/index.js", import.meta.url);
const build: ServerBuild = await import(buildUrl.href);
const clientDirectory = fileURLToPath(new URL("./client", import.meta.url));
const publicPath = new URL(build.publicPath, env.APP_URL).pathname;

const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(
  path.posix.join(publicPath, "assets"),
  express.static(path.join(clientDirectory, "assets"), { immutable: true, maxAge: "1y" }),
);
app.use(publicPath, express.static(clientDirectory));
app.all("/{*splat}", createRequestHandler({ build, mode: env.NODE_ENV }));

const handleTransportError: ErrorRequestHandler = (error: unknown, request, response, next) => {
  log.error("HTTP transport failed", error, { "http.request.method": request.method });
  if (response.headersSent) {
    next(new Error("HTTP response could not be completed"));
    return;
  }
  response.status(500).send("Internal Server Error");
};
app.use(handleTransportError);

const server = app.listen(env.PORT, env.HOST, (error) => {
  if (error) {
    log.error("Web server could not start", error);
    void processController.stop(1);
    return;
  }
  log.info("Web server ready");
});
processController.registerDrain(() => {
  if (!server.listening) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

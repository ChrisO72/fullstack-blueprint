import { observabilityShutdown } from "./observability/vite.ts";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
  ssr: {
    external: [
      "@opentelemetry/api",
      "@opentelemetry/api-logs",
      "pg",
      "ioredis",
      "bullmq",
      "undici",
    ],
  },
  publicDir: "web/public",
  plugins: [
    tailwindcss(),
    // The unit suite needs Node resolution, not the router build plugin's "module" condition.
    !process.env.VITEST && reactRouter(),
    observabilityShutdown(),
  ],
  resolve: {
    alias: [
      { find: "~/db", replacement: fileURLToPath(new URL("./db", import.meta.url)) },
      { find: "~/mail", replacement: fileURLToPath(new URL("./mail", import.meta.url)) },
      {
        find: "~/observability",
        replacement: fileURLToPath(new URL("./observability", import.meta.url)),
      },
      { find: "~/storage", replacement: fileURLToPath(new URL("./storage", import.meta.url)) },
      { find: "~/worker", replacement: fileURLToPath(new URL("./worker", import.meta.url)) },
      {
        find: "~/env.server",
        replacement: fileURLToPath(new URL("./env.server.ts", import.meta.url)),
      },
      { find: "~", replacement: fileURLToPath(new URL("./web", import.meta.url)) },
    ],
  },
  test: {
    fileParallelism: false,
    include: ["test/**/*.test.ts"],
    maxWorkers: 1,
    setupFiles: ["./test/setup.ts"],
  },
});

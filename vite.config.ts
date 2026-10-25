import { telemetryShutdown } from "./telemetry/vite.ts";
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
    telemetryShutdown(),
  ],
  resolve: {
    alias: [
      { find: "~/db", replacement: fileURLToPath(new URL("./db", import.meta.url)) },
      { find: "~/mail", replacement: fileURLToPath(new URL("./mail", import.meta.url)) },
      {
        find: "~/telemetry",
        replacement: fileURLToPath(new URL("./telemetry", import.meta.url)),
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
    include: ["test/**/*.test.ts"],
    // Satisfy environment validation; unit tests use in-memory dependencies.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/unit_test",
      REDIS_URL: "redis://127.0.0.1:1",
      RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret-that-is-at-least-32-characters",
      JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
      REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-characters",
      APP_URL: "http://localhost:5173",
    },
  },
});

import "dotenv/config";
import { spawn } from "node:child_process";

const token = process.env.SENTRY_AGENT_TOKEN;
if (!token)
  throw new Error(
    "Set SENTRY_AGENT_TOKEN to a read-only token from local Sentry. See telemetry/debugging.md.",
  );
const child = spawn(
  process.execPath,
  ["./node_modules/sentry/dist/bin.cjs", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      SENTRY_HOST: process.env.SENTRY_URL || "http://localhost:9090",
      SENTRY_AUTH_TOKEN: token,
      SENTRY_TOKEN: token,
      SENTRY_FORCE_ENV_TOKEN: "1",
      SENTRY_ORG: process.env.SENTRY_ORG || "blueprint",
      SENTRY_PROJECT: process.env.SENTRY_PROJECT || "blueprint",
      SENTRY_CONFIG_DIR: `${process.cwd()}/telemetry/sentry/.local/cli`,
      DO_NOT_TRACK: "1",
      // Never give the agent CLI the artifact-upload credential.
      SENTRY_UPLOAD_TOKEN: "",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

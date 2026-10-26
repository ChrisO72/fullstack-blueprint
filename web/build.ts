import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { prepareBuild, finishBuild } from "../telemetry/build";

const directory = prepareBuild("web");
execFileSync(process.execPath, ["node_modules/@react-router/dev/bin.cjs", "build"], {
  stdio: "inherit",
  env: process.env,
});
await build({
  entryPoints: ["web/server.ts"],
  outfile: `${directory}/serve.js`,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: "external",
});
await finishBuild(directory);

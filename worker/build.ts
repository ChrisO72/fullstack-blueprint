import { build } from "esbuild";
import { prepareBuild, finishBuild } from "../telemetry/build";

const directory = prepareBuild("worker");
await build({
  entryPoints: ["worker/index.ts"],
  outfile: `${directory}/index.js`,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: "external",
});
await finishBuild(directory);

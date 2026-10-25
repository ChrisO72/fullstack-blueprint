import { execFileSync } from "node:child_process";
import { prepareBuild, finishBuild } from "../telemetry/build";

const directory = prepareBuild("web");
execFileSync(process.execPath, ["node_modules/@react-router/dev/bin.cjs", "build"], {
  stdio: "inherit",
  env: process.env,
});
await finishBuild(directory);

import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";
import createSentrySDK from "sentry";
import { sourceRelease } from "./release.server";

export function prepareBuild(service: "web" | "worker") {
  process.env.SENTRY_RELEASE = sourceRelease();
  process.env.SENTRY_SERVICE = service;
  process.env.NODE_ENV = "production";
  process.env.DO_NOT_TRACK = "1";
  const directory = `build/${service}`;
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  // Available when the web build evaluates server modules, before finalization.
  writeFileSync(
    join(directory, "release.json"),
    JSON.stringify({ release: process.env.SENTRY_RELEASE }) + "\n",
  );
  return directory;
}

export async function finishBuild(directory: string) {
  await build({
    entryPoints: ["telemetry/register.server.ts"],
    outfile: join(directory, "telemetry.js"),
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    sourcemap: "external",
  });
  // Local transformations only; uploading is a separate authenticated command.
  await createSentrySDK().sourcemap.inject({ directory });
  const artifacts = join(directory, "sentry-artifacts");
  function stage(sourceDirectory: string, relative = "") {
    for (const entry of readdirSync(sourceDirectory, { withFileTypes: true })) {
      if (entry.name === "sentry-artifacts") continue;
      const source = join(sourceDirectory, entry.name);
      const destination = join(artifacts, relative, entry.name);
      if (entry.isDirectory()) stage(source, join(relative, entry.name));
      else if (/\.(?:[cm]?js|map)$/.test(entry.name)) {
        mkdirSync(join(artifacts, relative), { recursive: true });
        copyFileSync(source, destination);
        if (relative.split("/")[0] === "client" && entry.name.endsWith(".map")) rmSync(source);
      }
    }
  }
  stage(directory);
  // React Router may clean its output directory during the build.
  writeFileSync(
    join(directory, "release.json"),
    JSON.stringify({ release: process.env.SENTRY_RELEASE }) + "\n",
  );
}

import "dotenv/config";
import { readFileSync } from "node:fs";
import createSentrySDK from "sentry";
import { releaseManifestSchema } from "../release.server";

if (!process.env.SENTRY_UPLOAD_TOKEN)
  throw new Error(
    "Set SENTRY_UPLOAD_TOKEN for artifact uploads. See telemetry/sentry/releases.md.",
  );
const services = process.argv.slice(2);
if (services.some((service) => service !== "web" && service !== "worker"))
  throw new Error("Usage: npm run sentry:upload -- [web|worker ...]");
const artifacts = (services.length ? services : ["web", "worker"]).map((service) => {
  const directory = `build/${service}`;
  const manifest: unknown = JSON.parse(readFileSync(`${directory}/release.json`, "utf8"));
  return {
    directory: `${directory}/sentry-artifacts`,
    release: releaseManifestSchema.parse(manifest).release,
  };
});
process.env.DO_NOT_TRACK = "1";
const sdk = createSentrySDK({
  token: process.env.SENTRY_UPLOAD_TOKEN,
  url: process.env.SENTRY_URL || "http://localhost:9090",
  org: process.env.SENTRY_ORG || "blueprint",
  project: process.env.SENTRY_PROJECT || "blueprint",
});
for (const artifact of artifacts) await sdk.sourcemap.upload({ ...artifact, noRewrite: true });

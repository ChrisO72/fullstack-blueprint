import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";

export const releaseManifestSchema = z.object({ release: z.string().min(1) });

export function sourceRelease(): string {
  if (process.env.SENTRY_RELEASE) return process.env.SENTRY_RELEASE;
  try {
    const sha = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return `blueprint@${sha}${dirty ? "-dirty" : ""}`;
  } catch {
    return "blueprint@local";
  }
}

export function resolveRelease(): string {
  if (process.env.SENTRY_RELEASE) return process.env.SENTRY_RELEASE;
  if (process.env.NODE_ENV !== "production") return sourceRelease();
  const service = z.enum(["web", "worker"]).parse(process.env.SENTRY_SERVICE);
  const manifest: unknown = JSON.parse(readFileSync(`build/${service}/release.json`, "utf8"));
  return releaseManifestSchema.parse(manifest).release;
}

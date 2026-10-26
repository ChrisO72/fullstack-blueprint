import { cpSync, mkdirSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("build/db", { recursive: true, force: true });
mkdirSync("build/db", { recursive: true });
await build({
  entryPoints: ["db/migrate.ts"],
  outfile: "build/db/migrate.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
cpSync("db/drizzle", "build/db/drizzle", { recursive: true });

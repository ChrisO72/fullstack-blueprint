import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const version = "26.10.0";
const providerDirectory = fileURLToPath(new URL(".", import.meta.url));
const directory = resolve(providerDirectory, ".local/self-hosted");
const marker = resolve(directory, ".blueprint-installed");
const ownership = resolve(directory, ".blueprint-owner");
const network = "fullstack-blueprint-sentry-ingress";
const action = process.argv[2];
const run = (command: string, args: string[], cwd = directory) =>
  execFileSync(command, args, { cwd, stdio: "inherit" });
function ensureNetwork() {
  try {
    execFileSync("docker", ["network", "inspect", network], { stdio: "ignore" });
  } catch {
    run("docker", ["network", "create", network]);
  }
}
function compose(args: string[]) {
  run("docker", ["compose", "--env-file", ".env", "--env-file", ".env.custom", ...args]);
}
if (action === "setup") {
  if (!existsSync(directory)) {
    mkdirSync(resolve(providerDirectory, ".local"), { recursive: true });
    run(
      "git",
      [
        "clone",
        "--branch",
        version,
        "--depth",
        "1",
        "https://github.com/getsentry/self-hosted.git",
        directory,
      ],
      process.cwd(),
    );
  }
  const tag = execFileSync("git", ["describe", "--tags", "--exact-match"], {
    cwd: directory,
    encoding: "utf8",
  }).trim();
  if (tag !== version)
    throw new Error(
      `Expected Sentry ${version}; refusing to upgrade or overwrite this installation.`,
    );
  if (!existsSync(ownership)) {
    // Upstream uses fixed external volume names. Never adopt another Sentry installation's data.
    for (const name of [
      "sentry-clickhouse",
      "sentry-data",
      "sentry-kafka",
      "sentry-postgres",
      "sentry-redis",
      "sentry-seaweedfs",
    ]) {
      let exists = false;
      try {
        execFileSync("docker", ["volume", "inspect", name], { stdio: "ignore" });
        exists = true;
      } catch {
        /* Not created yet. */
      }
      if (exists)
        throw new Error(
          `Existing ${name} volume belongs to another installation. Use an isolated Docker context; no data was modified.`,
        );
    }
    writeFileSync(ownership, "fullstack-blueprint\n");
  }
  ensureNetwork();
  copyFileSync(
    resolve(providerDirectory, "compose.override.yml"),
    resolve(directory, "docker-compose.override.yml"),
  );
  const envFile = resolve(directory, ".env.custom");
  if (!existsSync(envFile))
    writeFileSync(
      envFile,
      [
        "COMPOSE_PROJECT_NAME=fullstack-blueprint-sentry",
        "COMPOSE_PROFILES=feature-complete",
        "SENTRY_EVENT_RETENTION_DAYS=3",
        "SENTRY_BIND=127.0.0.1:9090",
        `LAUNCHPAD_RPC_SHARED_SECRET=${randomBytes(32).toString("hex")}`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
  const configFile = resolve(directory, "sentry/config.yml");
  if (!existsSync(configFile)) {
    const template = readFileSync(resolve(directory, "sentry/config.example.yml"), "utf8");
    writeFileSync(configFile, `${template}\nsystem.url-prefix: 'http://localhost:9090'\n`, {
      mode: 0o600,
    });
  }
  run("bash", ["./install.sh", "--no-report-self-hosted-issues"]);
  writeFileSync(marker, `${version}\n`);
  compose(["up", "-d"]);
  console.info(
    "Sentry is at http://localhost:9090. Create blueprint/blueprint and configure DSNs/tokens as described in telemetry/sentry/README.md.",
  );
} else if (action === "up") {
  if (!existsSync(marker))
    throw new Error(
      "Sentry is not installed. Run make telemetry-setup once; see telemetry/sentry/README.md.",
    );
  if (readFileSync(marker, "utf8").trim() !== version)
    throw new Error(`Sentry installation must match pinned version ${version}.`);
  ensureNetwork();
  compose(["up", "-d"]);
} else if (action === "down") {
  if (existsSync(marker)) compose(["down"]);
} else {
  throw new Error("Usage: telemetry/sentry/stack.sh setup|up|down");
}

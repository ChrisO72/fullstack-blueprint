import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { testEnvironment } from "./environment";

function run(command: string, args: string[], env = process.env): void {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`);
  }
}

function assertSafeTestDatabase(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.slice(1);
  const isLocal = url.hostname === "127.0.0.1" || url.hostname === "localhost";

  if (process.env.NODE_ENV !== "test" || !isLocal || !databaseName.endsWith("_test")) {
    throw new Error("Refusing to reset a database that is not a local test database");
  }
}

async function prepareTestDatabase(databaseUrl: string): Promise<void> {
  assertSafeTestDatabase(databaseUrl);

  const resetClient = new Client({ connectionString: databaseUrl });
  await resetClient.connect();
  try {
    await resetClient.query(
      "drop schema if exists drizzle cascade; drop schema public cascade; create schema public",
    );
  } finally {
    await resetClient.end();
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL("../db/drizzle", import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const composeFile = fileURLToPath(new URL("./compose.yml", import.meta.url));
  const composeArgs = ["compose", "-f", composeFile, "-p", "fullstack-blueprint-test"];
  process.env.NODE_ENV = testEnvironment.NODE_ENV;
  try {
    run("docker", [...composeArgs, "up", "-d", "--wait", "database"]);
    await prepareTestDatabase(testEnvironment.DATABASE_URL);

    const vitestCli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
    run(process.execPath, [vitestCli, "run", "--project", "integration"], {
      ...process.env,
      ...testEnvironment,
    });
  } finally {
    run("docker", [...composeArgs, "down", "--volumes"]);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

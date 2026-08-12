import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

const TEST_DATABASE_NAME = "blueprint_test";
const POSTGRES_HOST = "127.0.0.1";
const POSTGRES_PORT = "55432";

function postgresUrl(databaseName: string): string {
  const url = new URL(`postgresql://${POSTGRES_HOST}:${POSTGRES_PORT}/${databaseName}`);
  url.username = process.env.POSTGRES_USER ?? "blueprint-user";
  url.password = process.env.POSTGRES_PASSWORD ?? "blueprint-password";
  return url.toString();
}

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
  const admin = new Client({ connectionString: postgresUrl("postgres") });
  await admin.connect();
  try {
    const result = await admin.query("select 1 from pg_database where datname = $1", [
      TEST_DATABASE_NAME,
    ]);
    if (result.rowCount === 0) {
      await admin.query(`create database "${TEST_DATABASE_NAME}"`);
    }
  } finally {
    await admin.end();
  }

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
  run("docker", ["compose", "up", "-d", "--wait", "database"]);

  const databaseUrl = postgresUrl(TEST_DATABASE_NAME);
  const testEnvironment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    REDIS_URL: "redis://127.0.0.1:6379",
    RATE_LIMIT_KEY_SECRET: "test-rate-limit-secret-that-is-at-least-32-characters",
    JWT_SECRET: "test-jwt-secret-that-is-at-least-32-characters",
    REFRESH_SECRET: "test-refresh-secret-that-is-at-least-32-characters",
    APP_URL: "http://localhost:5173",
  };

  process.env.NODE_ENV = testEnvironment.NODE_ENV;
  process.env.DATABASE_URL = testEnvironment.DATABASE_URL;
  await prepareTestDatabase(databaseUrl);

  const vitestCli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
  run(process.execPath, [vitestCli, "run"], testEnvironment);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

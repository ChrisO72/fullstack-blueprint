import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "./env.server";
import { sanitizeText } from "~/telemetry/redact";

const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10_000 });

try {
  console.info("Applying database migrations...");
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL("./drizzle", import.meta.url)),
  });
  console.info("Database migrations applied successfully.");
} catch (error) {
  console.error("Database migration failed:");
  // Drizzle wraps driver errors. Report their causes without dumping SQL/parameters or URLs.
  const seen = new Set<unknown>();
  let cause: unknown = error;
  while (cause instanceof Error && !seen.has(cause)) {
    seen.add(cause);
    const code = "code" in cause && typeof cause.code === "string" ? cause.code : undefined;
    const message = cause.message.startsWith("Failed query:")
      ? "Migration query failed; see the underlying error below."
      : sanitizeText(cause.message);
    console.error(`${code ? `[${sanitizeText(code)}] ` : ""}${message}`);
    cause = cause.cause;
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}

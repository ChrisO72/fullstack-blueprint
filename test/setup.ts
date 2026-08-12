import { sql } from "drizzle-orm";
import { afterEach } from "vitest";
import { db } from "~/db/db";

afterEach(async () => {
  await db.execute(sql`truncate table organizations restart identity cascade`);
});

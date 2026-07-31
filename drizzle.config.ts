import { defineConfig } from "drizzle-kit";
import { env } from "./env.server";

export default defineConfig({
  out: "./db/drizzle",
  schema: [
    "./db/schema/organizations.ts",
    "./db/schema/auth.ts",
    "./db/schema/items.ts",
    "./db/schema/settings.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});

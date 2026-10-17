import { registerCleanup } from "~/observability/runtime.server";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../env.server";

export const db = drizzle(env.DATABASE_URL);

registerCleanup(() => db.$client.end());

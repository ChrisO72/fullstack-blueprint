import { readEnvironment } from "~/runtime/env.server";
import { databaseEnvSchema } from "./config";
export const env = readEnvironment(databaseEnvSchema);

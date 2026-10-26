import { readEnvironment } from "~/runtime/env.server";
import { mailEnvSchema } from "./config";
export const env = readEnvironment(mailEnvSchema);

import { readEnvironment } from "~/runtime/env.server";
import { webEnvSchema } from "./config";
export const env = readEnvironment(webEnvSchema);

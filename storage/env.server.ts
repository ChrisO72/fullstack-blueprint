import { readEnvironment } from "~/runtime/env.server";
import { storageEnvSchema } from "./config";
export const env = readEnvironment(storageEnvSchema);

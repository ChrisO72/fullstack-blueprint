import { readEnvironment } from "~/runtime/env.server";
import { workerEnvSchema } from "./config";
export const env = readEnvironment(workerEnvSchema);

import { z } from "zod";
import { optionalString } from "~/runtime/config";

export const mailEnvSchema = z.object({
  APP_URL: z.url(),
  LETTERMINT_API_KEY: optionalString,
  LETTERMINT_MAIL_FROM: optionalString,
});

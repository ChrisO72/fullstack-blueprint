import { Lettermint } from "lettermint";
import { env } from "./env.server";
import { log } from "~/telemetry/log.server";

const lettermint = env.LETTERMINT_API_KEY
  ? new Lettermint({
      apiToken: env.LETTERMINT_API_KEY,
    })
  : null;

const from = env.LETTERMINT_MAIL_FROM;

export const isEmailConfigured = lettermint !== null && Boolean(from);

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail({ to, subject, html, text }: Email) {
  if (!lettermint || !from) {
    throw new Error(
      "If the Lettermint environment variables are set, the app can send emails. Email is used for account confirmation and password resets.",
    );
  }

  try {
    await lettermint.email.from(from).to(to).subject(subject).html(html).text(text).send();
  } catch (error) {
    log.warn("Email delivery failed");
    throw error;
  }
}

import { Lettermint } from "lettermint";
import { env } from "~/env.server";
import { createLogger } from "~/observability/logger.server";

const logger = createLogger("worker");

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

  const startedAt = performance.now();
  logger.info("mail.send.started", { component: "mail" });

  let response;
  try {
    response = await lettermint.email
      .from(from)
      .to(to)
      .subject(subject)
      .html(html)
      .text(text)
      .send();
  } catch (error) {
    logger.error("mail.send.failed", error, {
      component: "mail",
      durationMs: Math.round(performance.now() - startedAt),
    });
    throw error;
  }

  logger.info("mail.send.completed", {
    component: "mail",
    durationMs: Math.round(performance.now() - startedAt),
    providerMessageId: response.message_id,
    providerStatus: response.status,
  });
}

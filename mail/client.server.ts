import { Lettermint } from "lettermint";
import { env } from "~/env.server";

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

  console.log(`[mail] sending email to ${to}`);

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
    console.error(`[mail] Failed to send email to ${to}:`, error);
    throw error;
  }

  console.log(`[mail] sent to ${to} — id: ${response.message_id}, status: ${response.status}`);
}

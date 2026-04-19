import { Lettermint } from "lettermint";

const lettermint = new Lettermint({
  apiToken: process.env.LETTERMINT_API_KEY!,
});

const from = process.env.MAIL_FROM || "noreply@example.com";

export async function sendConfirmationEmail(to: string, token: string) {
  const confirmUrl = `${process.env.APP_URL}/confirm-email?token=${token}`;

  console.log(`[mail] sending confirmation email to ${to}`);

  let response;
  try {
    response = await lettermint.email
      .from(from)
      .to(to)
      .subject("Confirm your email address")
      .html(
        [
          "<h2>Confirm your email</h2>",
          `<p>Click the link below to confirm your email address:</p>`,
          `<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
          `<p>This link expires in 24 hours.</p>`,
        ].join("\n"),
      )
      .text(`Confirm your email address: ${confirmUrl}\n\nThis link expires in 24 hours.`)
      .send();
  } catch (error) {
    console.error(`[mail] Failed to send confirmation email to ${to}:`, error);
    throw error;
  }

  console.log(`[mail] sent to ${to} — id: ${response.message_id}, status: ${response.status}`);
}

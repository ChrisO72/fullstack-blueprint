import { env } from "~/env.server";
import { sendEmail } from "./client.server";

type ConfirmationEmail = {
  to: string;
  token: string;
  expiresInHours: number;
};

export async function sendConfirmationEmail({ to, token, expiresInHours }: ConfirmationEmail) {
  const confirmUrl = `${env.APP_URL}/confirm-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Confirm your email address",
    html: [
      "<h2>Confirm your email</h2>",
      "<p>Click the link below to confirm your email address:</p>",
      `<p><a href="${confirmUrl}">${confirmUrl}</a></p>`,
      `<p>This link expires in ${expiresInHours} hours.</p>`,
    ].join("\n"),
    text: `Confirm your email address: ${confirmUrl}\n\nThis link expires in ${expiresInHours} hours.`,
  });
}

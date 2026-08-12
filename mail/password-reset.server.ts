import { env } from "~/env.server";
import { sendEmail } from "./client.server";

type PasswordResetEmail = {
  to: string;
  token: string;
  expiresInHours: number;
};

export async function sendPasswordResetEmail({ to, token, expiresInHours }: PasswordResetEmail) {
  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: "Reset your password",
    html: [
      "<h2>Reset your password</h2>",
      "<p>Click the link below to choose a new password:</p>",
      `<p><a href="${resetUrl}">${resetUrl}</a></p>`,
      `<p>This link expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}.</p>`,
      "<p>If you did not request a password reset, you can ignore this email.</p>",
    ].join("\n"),
    text: [
      `Reset your password: ${resetUrl}`,
      "",
      `This link expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}.`,
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n"),
  });
}

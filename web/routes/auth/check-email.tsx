import { useState, useEffect } from "react";
import { redirect, useFetcher } from "react-router";
import { AuthLayout } from "../../components/ui-kit/auth-layout";
import { Button } from "../../components/ui-kit/button";
import { Heading } from "../../components/ui-kit/heading";
import { Strong, Text, TextLink } from "../../components/ui-kit/text";
import {
  getUserByEmail,
  createEmailConfirmationToken,
  getLatestConfirmationTokenCreatedAt,
} from "../../../db/repositories/auth";
import { sendConfirmationEmail } from "../../lib/mail.server";
import type { Route } from "./+types/check-email";

// const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  if (cookieHeader.includes("accessToken=")) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!email) {
    return { email: null, lastSentAt: null };
  }

  const user = await getUserByEmail(email);
  if (!user || user.emailConfirmedAt) {
    return { email: null, lastSentAt: null };
  }

  const lastSentAt = await getLatestConfirmationTokenCreatedAt(user.id);
  return { email, lastSentAt: lastSentAt?.toISOString() ?? null };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  if (!email) return { error: "Missing email." };

  const user = await getUserByEmail(email);
  if (!user || user.emailConfirmedAt) {
    return { error: "No pending confirmation for this email." };
  }

  const lastSentAt = await getLatestConfirmationTokenCreatedAt(user.id);
  if (lastSentAt && Date.now() - lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { error: "Please wait before requesting another email." };
  }

  const token = await createEmailConfirmationToken(user.id);
  try {
    await sendConfirmationEmail(email, token);
  } catch {
    return { error: "Failed to send email. Please try again later." };
  }

  return { success: true, resentAt: new Date().toISOString() };
}

function useCountdown(targetMs: number | null) {
  const [remaining, setRemaining] = useState(() =>
    targetMs ? Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!targetMs) {
      setRemaining(0);
      return;
    }
    setRemaining(Math.max(0, Math.ceil((targetMs - Date.now()) / 1000)));
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  return remaining;
}

export default function CheckEmailPage({ loaderData }: Route.ComponentProps) {
  const { email, lastSentAt } = loaderData as {
    email: string | null;
    lastSentAt: string | null;
  };
  const fetcher = useFetcher<typeof action>();

  const resentAt = fetcher.data && "resentAt" in fetcher.data ? fetcher.data.resentAt : null;
  const effectiveLastSent = resentAt ?? lastSentAt;
  const cooldownEnd = effectiveLastSent
    ? new Date(effectiveLastSent).getTime() + RESEND_COOLDOWN_MS
    : null;
  const remaining = useCountdown(cooldownEnd);

  const isSending = fetcher.state !== "idle";
  const canResend = email && remaining <= 0 && !isSending;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <AuthLayout>
      <div className="grid w-full max-w-sm grid-cols-1 gap-6 text-center">
        <Heading>Check your email</Heading>
        <Text>
          We sent you a confirmation link. Please check your inbox and click the
          link to verify your email address.
        </Text>

        {fetcher.data && "error" in fetcher.data && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {fetcher.data.error}
          </div>
        )}

        {fetcher.data && "success" in fetcher.data && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Confirmation email resent.
          </div>
        )}

        {email && (
          <fetcher.Form method="POST">
            <input type="hidden" name="email" value={email} />
            <Button
              type="submit"
              outline
              className="w-full"
              disabled={!canResend}
            >
              {isSending
                ? "Sending..."
                : remaining > 0
                  ? `Resend in ${minutes}:${String(seconds).padStart(2, "0")}`
                  : "Resend confirmation email"}
            </Button>
          </fetcher.Form>
        )}

        <Text>
          Already confirmed?{" "}
          <TextLink href="/login">
            <Strong>Sign in</Strong>
          </TextLink>
        </Text>
      </div>
    </AuthLayout>
  );
}

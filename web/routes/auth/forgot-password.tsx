import { Form, redirect, useActionData, useNavigation } from "react-router";
import { z } from "zod";
import { FieldError } from "~/components/field-error";
import { AuthLayout } from "~/components/ui-kit/auth-layout";
import { Button } from "~/components/ui-kit/button";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { Heading } from "~/components/ui-kit/heading";
import { Input } from "~/components/ui-kit/input";
import { Strong, Text, TextLink } from "~/components/ui-kit/text";
import { getUserByEmail } from "~/db/repositories/users";
import {
  canCreatePasswordResetToken,
  createPasswordResetToken,
  deletePasswordResetToken,
  PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
} from "~/lib/auth/password-reset.server";
import { verifyAccessToken } from "~/lib/auth/tokens.server";
import { parseForm, type ActionData } from "~/lib/form";
import { isEmailConfigured } from "~/mail/client.server";
import { readAccessTokenCookie } from "~/lib/session.server";
import { enqueuePasswordResetEmailJob } from "~/worker/jobs/send-password-reset-email";
import type { Route } from "./+types/forgot-password";

const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

type ForgotPasswordActionData = ActionData & { success?: boolean };

function requireEmailConfigured() {
  if (!isEmailConfigured) {
    throw new Response("Not Found", { status: 404 });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  requireEmailConfigured();

  const accessToken = await readAccessTokenCookie(request);
  if (accessToken && verifyAccessToken(accessToken)) {
    return redirect("/");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs): Promise<ForgotPasswordActionData> {
  requireEmailConfigured();

  const formData = await request.formData();
  const { data, fieldErrors } = parseForm(formData, forgotPasswordSchema);
  if (fieldErrors) return { fieldErrors };

  const user = await getUserByEmail(data.email);
  if (!user?.passwordHash || !(await canCreatePasswordResetToken(user.id))) {
    return { success: true };
  }

  const token = await createPasswordResetToken(user.id);
  try {
    await enqueuePasswordResetEmailJob({
      to: user.email,
      token,
      expiresInHours: PASSWORD_RESET_TOKEN_EXPIRY_HOURS,
    });
  } catch (error) {
    await deletePasswordResetToken(token);
    console.error("[auth] Failed to enqueue password reset email:", error);
  }

  return { success: true };
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<ForgotPasswordActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <AuthLayout>
      <div className="grid w-full max-w-sm grid-cols-1 gap-8">
        <Heading>Forgot your password?</Heading>

        {actionData?.success ? (
          <>
            <Text>If an account exists for that email address, we sent a password reset link.</Text>
            <Text>
              <TextLink href="/login">
                <Strong>Return to sign in</Strong>
              </TextLink>
            </Text>
          </>
        ) : (
          <Form method="POST" className="grid grid-cols-1 gap-8">
            <Text>Enter your email address and we&apos;ll send you a password reset link.</Text>

            <Field>
              <Label>Email</Label>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                invalid={!!actionData?.fieldErrors?.email}
              />
              <FieldError name="email" actionData={actionData} />
            </Field>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send reset link"}
            </Button>

            <Text>
              Remember your password?{" "}
              <TextLink href="/login">
                <Strong>Sign in</Strong>
              </TextLink>
            </Text>
          </Form>
        )}
      </div>
    </AuthLayout>
  );
}

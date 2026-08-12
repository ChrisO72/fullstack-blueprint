import { Form, redirect, useActionData, useNavigation } from "react-router";
import { z } from "zod";
import { FieldError } from "~/components/field-error";
import { FormError } from "~/components/form-error";
import { AuthLayout } from "~/components/ui-kit/auth-layout";
import { Button } from "~/components/ui-kit/button";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { Heading } from "~/components/ui-kit/heading";
import { Input } from "~/components/ui-kit/input";
import { Strong, Text, TextLink } from "~/components/ui-kit/text";
import { resetPassword, verifyPasswordResetToken } from "~/lib/auth/password-reset.server";
import { parseForm, type ActionData } from "~/lib/form";
import { isEmailConfigured } from "~/mail/client.server";
import { clearAuthCookies } from "~/lib/session.server";
import type { Route } from "./+types/reset-password";

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function requireEmailConfigured() {
  if (!isEmailConfigured) {
    throw new Response("Not Found", { status: 404 });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  requireEmailConfigured();

  const token = new URL(request.url).searchParams.get("token");
  if (!token || !(await verifyPasswordResetToken(token))) {
    return { token: null, error: "This password reset link is invalid or has expired." };
  }

  return { token, error: null };
}

export async function action({ request }: Route.ActionArgs): Promise<ActionData | Response> {
  requireEmailConfigured();

  const formData = await request.formData();
  const { data, fieldErrors } = parseForm(formData, resetPasswordSchema);
  if (fieldErrors?.token) {
    return { formError: "This password reset link is invalid or has expired." };
  }
  if (fieldErrors) return { fieldErrors };

  if (!(await resetPassword(data.token, data.password))) {
    return { formError: "This password reset link is invalid or has expired." };
  }

  const cookies = await clearAuthCookies();
  return redirect("/login?passwordReset=success", {
    headers: cookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function ResetPasswordPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (!loaderData.token) {
    return (
      <AuthLayout>
        <div className="grid w-full max-w-sm grid-cols-1 gap-6 text-center">
          <Heading>Reset your password</Heading>
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {loaderData.error}
          </div>
          <Text>
            <TextLink href="/forgot-password">
              <Strong>Request a new reset link</Strong>
            </TextLink>
            {" or "}
            <TextLink href="/login">
              <Strong>sign in</Strong>
            </TextLink>
          </Text>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Form method="POST" className="grid w-full max-w-sm grid-cols-1 gap-8">
        <Heading>Choose a new password</Heading>

        <FormError actionData={actionData} />
        <input type="hidden" name="token" value={loaderData.token} />

        <Field>
          <Label>New password</Label>
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            invalid={!!actionData?.fieldErrors?.password}
          />
          <FieldError name="password" actionData={actionData} />
        </Field>

        <Field>
          <Label>Confirm new password</Label>
          <Input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            invalid={!!actionData?.fieldErrors?.confirmPassword}
          />
          <FieldError name="confirmPassword" actionData={actionData} />
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>
      </Form>
    </AuthLayout>
  );
}

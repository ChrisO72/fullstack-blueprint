import { Form, redirect, useActionData, useNavigation } from "react-router";
import { z } from "zod";
import { AuthLayout } from "~/components/ui-kit/auth-layout";
import { Button } from "~/components/ui-kit/button";
import { FieldError } from "~/components/field-error";
import { Field, Label } from "~/components/ui-kit/fieldset";
import { Heading } from "~/components/ui-kit/heading";
import { Input } from "~/components/ui-kit/input";
import { Strong, Text, TextLink } from "~/components/ui-kit/text";
import { getSiteSettings } from "~/db/repositories/settings";
import { getUserByEmail } from "~/db/repositories/users";
import {
  createEmailConfirmationToken,
  createTokens,
  createUserWithPassword,
  verifyAccessToken,
} from "~/lib/auth.server";
import { parseForm, type FieldErrors } from "~/lib/form";
import { readAccessTokenCookie, setAuthCookies } from "~/lib/session.server";
import { sendConfirmationEmail } from "~/lib/mail.server";
import type { Route } from "./+types/signup";

const signupSchema = z.object({
  email: z.email("Please enter a valid email address"),
  firstname: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ActionData = {
  errors?: FieldErrors;
  formError?: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const accessToken = await readAccessTokenCookie(request);
  if (accessToken && verifyAccessToken(accessToken)) {
    return redirect("/");
  }
  return null;
}

export async function action({ request }: Route.ActionArgs): Promise<ActionData | Response> {
  const formData = await request.formData();
  const { data, errors } = parseForm(formData, signupSchema);
  if (errors) return { errors };

  const { email, firstname, password } = data;

  const settings = await getSiteSettings();

  if (settings.allowedDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain || !settings.allowedDomains.includes(domain)) {
      return { formError: "Signups from this email domain are not allowed" };
    }
  }

  const existing = await getUserByEmail(email);

  if (existing) {
    if (settings.requireMailConfirmation && !existing.emailConfirmedAt) {
      return redirect(`/check-email?email=${encodeURIComponent(email)}`);
    }
    return { errors: { email: ["An account with this email already exists"] } };
  }

  const user = await createUserWithPassword(email, password, firstname);

  if (settings.requireMailConfirmation) {
    const token = await createEmailConfirmationToken(user.id);
    try {
      await sendConfirmationEmail(email, token);
    } catch {
      return {
        formError: "Something went wrong sending the confirmation email. Please try again later.",
      };
    }
    return redirect(`/check-email?email=${encodeURIComponent(email)}`);
  }

  const { accessToken, refreshToken } = await createTokens(user.id, user.email);
  const cookies = await setAuthCookies(accessToken, refreshToken);

  return redirect("/", {
    headers: cookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function SignupPage() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;

  return (
    <AuthLayout>
      <Form method="POST" className="grid w-full max-w-sm grid-cols-1 gap-8">
        <Heading>Create your account</Heading>

        {actionData?.formError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {actionData.formError}
          </div>
        )}

        <Field>
          <Label>Email</Label>
          <Input type="email" name="email" invalid={!!errors?.email} />
          <FieldError name="email" errors={errors} />
        </Field>
        <Field>
          <Label>First name</Label>
          <Input name="firstname" invalid={!!errors?.firstname} />
          <FieldError name="firstname" errors={errors} />
        </Field>
        <Field>
          <Label>Password</Label>
          <Input
            type="password"
            name="password"
            autoComplete="new-password"
            invalid={!!errors?.password}
          />
          <FieldError name="password" errors={errors} />
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
        <Text>
          Already have an account?{" "}
          <TextLink href="/login">
            <Strong>Sign in</Strong>
          </TextLink>
        </Text>
      </Form>
    </AuthLayout>
  );
}

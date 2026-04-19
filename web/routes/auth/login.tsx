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
import { createTokens, validateLogin, verifyAccessToken } from "~/lib/auth.server";
import { parseForm, type FieldErrors } from "~/lib/form";
import { readAccessTokenCookie, setAuthCookies } from "~/lib/session.server";
import type { Route } from "./+types/login";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
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
  const { data, errors } = parseForm(formData, loginSchema);
  if (errors) return { errors };

  const { email, password } = data;

  const user = await validateLogin(email, password);
  if (!user) {
    return { formError: "Invalid email or password" };
  }

  const settings = await getSiteSettings();
  if (settings.requireMailConfirmation && !user.emailConfirmedAt) {
    return redirect(`/check-email?email=${encodeURIComponent(email)}`);
  }

  const { accessToken, refreshToken } = await createTokens(user.id, user.email);
  const cookies = await setAuthCookies(accessToken, refreshToken);

  return redirect("/", {
    headers: cookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function LoginPage() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;

  return (
    <AuthLayout>
      <Form method="POST" className="grid w-full max-w-sm grid-cols-1 gap-8">
        <Heading>Sign in to your account</Heading>

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
          <Label>Password</Label>
          <Input type="password" name="password" invalid={!!errors?.password} />
          <FieldError name="password" errors={errors} />
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>
        <Text>
          Don&apos;t have an account?{" "}
          <TextLink href="/signup">
            <Strong>Sign up</Strong>
          </TextLink>
        </Text>
      </Form>
    </AuthLayout>
  );
}

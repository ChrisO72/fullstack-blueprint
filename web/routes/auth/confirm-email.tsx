import { redirect } from "react-router";
import { AuthLayout } from "~/components/ui-kit/auth-layout";
import { Heading } from "~/components/ui-kit/heading";
import { Strong, Text, TextLink } from "~/components/ui-kit/text";
import { confirmUserEmail, createTokens, verifyEmailConfirmationToken } from "~/lib/auth.server";
import { setAuthCookies } from "~/lib/session.server";
import type { Route } from "./+types/confirm-email";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return { error: "No confirmation token provided." };
  }

  const user = await verifyEmailConfirmationToken(token);
  if (!user) {
    return { error: "This confirmation link is invalid or has expired." };
  }

  await confirmUserEmail(user.id, token);

  const { accessToken, refreshToken } = await createTokens(user.id, user.email);
  const cookies = await setAuthCookies(accessToken, refreshToken);

  return redirect("/", {
    headers: cookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function ConfirmEmailPage({ loaderData }: Route.ComponentProps) {
  const { error } = loaderData as { error: string };

  return (
    <AuthLayout>
      <div className="grid w-full max-w-sm grid-cols-1 gap-6 text-center">
        <Heading>Email confirmation</Heading>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
        <Text>
          <TextLink href="/signup">
            <Strong>Sign up again</Strong>
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

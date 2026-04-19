import { redirect } from "react-router";
import { clearAuthCookies, readRefreshTokenCookie } from "../../lib/session.server";
import { hashRefreshToken } from "../../lib/auth.server";
import { deleteRefreshTokenByHash } from "../../../db/repositories/refreshTokens";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
  const refreshToken = await readRefreshTokenCookie(request);
  if (refreshToken) {
    await deleteRefreshTokenByHash(hashRefreshToken(refreshToken));
  }

  const clearCookies = await clearAuthCookies();
  return redirect("/login", {
    headers: clearCookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function Logout() {
  return null;
}

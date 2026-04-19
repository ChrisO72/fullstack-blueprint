import { redirect } from "react-router";
import { clearAuthCookies, parseCookies } from "../../lib/session.server";
import { hashRefreshToken } from "../../lib/auth.server";
import { deleteRefreshTokenByHash } from "../../../db/repositories/refreshTokens";
import type { Route } from "./+types/logout";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = parseCookies(cookieHeader);

  if (cookies.refreshToken) {
    await deleteRefreshTokenByHash(hashRefreshToken(cookies.refreshToken));
  }

  const clearCookies = clearAuthCookies();
  return redirect("/login", {
    headers: clearCookies.map((cookie) => ["Set-Cookie", cookie] as [string, string]),
  });
}

export default function Logout() {
  return null;
}

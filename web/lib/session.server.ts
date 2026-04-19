import { createCookie, redirect } from "react-router";
import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
  refreshAccessToken,
  verifyAccessToken,
} from "./auth.server";
import { getUserById } from "../../db/repositories/users";

const isProduction = process.env.NODE_ENV === "production";

export const accessTokenCookie = createCookie("accessToken", {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: ACCESS_TOKEN_MAX_AGE,
});

export const refreshTokenCookie = createCookie("refreshToken", {
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
  path: "/",
  maxAge: REFRESH_TOKEN_MAX_AGE,
});

async function readAuthCookies(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const [accessToken, refreshToken] = await Promise.all([
    accessTokenCookie.parse(cookieHeader) as Promise<string | null>,
    refreshTokenCookie.parse(cookieHeader) as Promise<string | null>,
  ]);
  return { accessToken, refreshToken };
}

export async function readAccessTokenCookie(request: Request): Promise<string | null> {
  return (await accessTokenCookie.parse(request.headers.get("Cookie"))) as string | null;
}

export async function readRefreshTokenCookie(request: Request): Promise<string | null> {
  return (await refreshTokenCookie.parse(request.headers.get("Cookie"))) as string | null;
}

export async function requireAuth(request: Request) {
  const { accessToken, refreshToken } = await readAuthCookies(request);

  // Try access token first
  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      return {
        userId: payload.userId,
        email: payload.email,
        newAccessToken: null,
        newRefreshToken: null,
      };
    }
  }

  // Try refresh token
  if (refreshToken) {
    const result = await refreshAccessToken(refreshToken);
    if (result) {
      return {
        userId: result.user.id,
        email: result.user.email,
        newAccessToken: result.accessToken,
        newRefreshToken: result.refreshToken,
      };
    }
  }

  throw redirect("/login");
}

export async function requireAdmin(request: Request) {
  const auth = await requireAuth(request);
  const user = await getUserById(auth.userId);
  if (!user || user.role !== "admin") {
    throw redirect("/");
  }
  return { auth, user };
}

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<string[]> {
  return Promise.all([
    accessTokenCookie.serialize(accessToken),
    refreshTokenCookie.serialize(refreshToken),
  ]);
}

export async function clearAuthCookies(): Promise<string[]> {
  return Promise.all([
    accessTokenCookie.serialize("", { maxAge: 0 }),
    refreshTokenCookie.serialize("", { maxAge: 0 }),
  ]);
}

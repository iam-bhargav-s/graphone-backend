import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  AuthError,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  signupUser,
} from "../services/auth.service.js";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "../utils/jwt.js";
import {
  loginSchema,
  refreshSchema,
  signupSchema,
} from "../validators/auth.validator.js";

type AuthContext = Context<{ Variables: { userId: string } }>;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Lax",
  path: "/",
} as const;

const setAuthCookies = (
  c: Context,
  accessToken: string,
  refreshToken: string
) => {
  setCookie(c, ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });

  setCookie(c, REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
};

const clearAuthCookies = (c: Context) => {
  deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: "/" });
  deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: "/" });
};

const parseJsonBody = async (c: Context) => {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
};

const handleAuthError = (c: Context, error: unknown) => {
  if (error instanceof AuthError) {
    return c.json(
      { success: false, message: error.message },
      error.statusCode as ContentfulStatusCode
    );
  }

  console.error(error);

  return c.json(
    { success: false, message: "Internal server error" },
    500
  );
};

export const signup = async (c: Context) => {
  const parsed = signupSchema.safeParse(await parseJsonBody(c));

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    const result = await signupUser(parsed.data);

    setAuthCookies(c, result.accessToken, result.refreshToken);

    return c.json(
      {
        success: true,
        message: "Signup successful",
        user: result.user,
      },
      201
    );
  } catch (error) {
    return handleAuthError(c, error);
  }
};

export const login = async (c: Context) => {
  const parsed = loginSchema.safeParse(await parseJsonBody(c));

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    const result = await loginUser(parsed.data);

    setAuthCookies(c, result.accessToken, result.refreshToken);

    return c.json({
      success: true,
      message: "Login successful",
      user: result.user,
    });
  } catch (error) {
    return handleAuthError(c, error);
  }
};

export const logout = async (c: Context) => {
  try {
    await logoutUser(getCookie(c, REFRESH_TOKEN_COOKIE));
    clearAuthCookies(c);

    return c.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return handleAuthError(c, error);
  }
};

export const refresh = async (c: Context) => {
  const body = await parseJsonBody(c);
  const parsed = refreshSchema.safeParse({
    ...body,
    refreshToken: body.refreshToken ?? getCookie(c, REFRESH_TOKEN_COOKIE),
  });

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  try {
    const result = await refreshUserToken(parsed.data);

    setAuthCookies(c, result.accessToken, result.refreshToken);

    return c.json({
      success: true,
      message: "Token refreshed",
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    clearAuthCookies(c);

    return handleAuthError(c, error);
  }
};

export const me = async (c: AuthContext) => {
  try {
    const user = await getCurrentUser(c.get("userId"));

    return c.json({
      success: true,
      user,
    });
  } catch (error) {
    return handleAuthError(c, error);
  }
};

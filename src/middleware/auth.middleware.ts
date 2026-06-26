import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "../utils/jwt.js";

type AuthVariables = {
  userId: string;
};

export const authMiddleware: MiddlewareHandler<{
  Variables: AuthVariables;
}> = async (c, next) => {
  const accessToken = getCookie(c, ACCESS_TOKEN_COOKIE);

  if (!accessToken) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  try {
    const payload = verifyAccessToken(accessToken);

    c.set("userId", payload.userId);

    await next();
  } catch {
    return c.json({ success: false, message: "Invalid token" }, 401);
  }
};

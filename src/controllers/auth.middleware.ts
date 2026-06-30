import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import {
  ACCESS_TOKEN_COOKIE,
  verifyAccessToken,
} from "../utils/jwt";

export async function requireAuth(
  c: Context<{
    Variables: {
      prisma: any;
      userId: string;
    };
  }>,
  next: Next
) {

  let token =
    getCookie(c, ACCESS_TOKEN_COOKIE);

  if (!token) {

    const auth =
      c.req.header("Authorization");

    if (
      auth &&
      auth.startsWith("Bearer ")
    ) {
      token = auth.substring(7);
    }
  }

  if (!token) {
    return c.json(
      {
        success: false,
        message: "Authentication required",
      },
      401
    );
  }

  try {

    const payload =
      verifyAccessToken(token);

    c.set("userId", payload.userId);

    await next();

  } catch {

    return c.json(
      {
        success: false,
        message: "Invalid access token",
      },
      401
    );

  }

}
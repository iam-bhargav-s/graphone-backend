import { Hono } from "hono";

import {
  login,
  logout,
  me,
  refresh,
  signup,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const auth = new Hono<{ Variables: { userId: string } }>();

auth.post("/signup", signup);

auth.post("/login", login);

auth.post("/logout", logout);

auth.post("/refresh", refresh);

auth.get("/me", authMiddleware, me);

export default auth;

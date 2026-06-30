import { Hono } from "hono";

import {
  signup,
  login,
  logout,
  refresh,
  me,
} from "../controllers/auth.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

type AuthVariables = {
  prisma: any;
  userId: string;
};

const auth = new Hono<{
  Variables: AuthVariables;
}>();

auth.post("/signup", signup);

auth.post("/login", login);

auth.post("/logout", logout);

auth.post("/refresh", refresh);

auth.get(
  "/me",
  authMiddleware,
  me
);

export default auth;
app.route("/api/v1/auth", authRoutes);
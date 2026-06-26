import { Hono } from "hono";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
dotenv.config();

const app = new Hono();
app.route("/auth", authRoutes);

app.get("/", (c) => {
  return c.json({
    success: true,
    message: "GraphOne API Running",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default app;

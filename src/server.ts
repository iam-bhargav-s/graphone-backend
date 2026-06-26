import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import app from "./index.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Server running on http://localhost:${PORT}`);

export default app;

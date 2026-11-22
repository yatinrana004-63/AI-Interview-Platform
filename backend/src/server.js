import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import { inngest, functions } from "./lib/inngest.js";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import chatRoutes from "./routes/chatRoutes.js";
import practiceRoutes from "./routes/practiceRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");
app.use(express.json({ limit: "128kb" }));
app.use(cors({ origin: ENV.CLIENT_URL?.replace(/\/$/, "") || false, credentials: true }));

app.get("/health", (_req, res) => res.json({ msg: "succ from  api" }));
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api", clerkMiddleware());
app.use("/api/chat", chatRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found." }));

if (process.env.NODE_ENV === "production") {
  const frontendPath = fileURLToPath(new URL("../../frontend/dist/", import.meta.url));
  app.use(express.static(frontendPath));
  app.get("/{*any}", (_req, res) => res.sendFile(path.join(frontendPath, "index.html")));
}

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  if (status >= 500) console.error(error.name, error.message);
  res.status(status).json({
    message: error.publicMessage || (status < 500 ? error.message : "Something went wrong. Please try again."),
  });
});

try {
  await connectDB();
  app.listen(PORT, "0.0.0.0", () => console.log("Server running on port " + PORT));
} catch (error) {
  console.error("Error starting server:", error.name);
  process.exitCode = 1;
}

import express from "express";
import path from "path";
import cors from "cors";
import {serve} from "inngest/express";
import {inngest,functions} from "./lib/inngest.js";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
const app = express();
const __dirname = path.resolve();
const PORT = process.env.PORT || 5000;


//middlewarw
app.use(express.json());
// 
app.use(cors({origin:ENV.CLIENT_URL,credentials:true}));
//inngest
app.use("/api/inngest",serve({client:inngest,functions}));

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "succ from  api" });
});
app.get("/books", (req, res) => {
  res.status(200).json({ msg: "succ from  book" });
});
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.resolve("frontend/dist");

  app.use(express.static(frontendPath));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}


const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};
startServer();
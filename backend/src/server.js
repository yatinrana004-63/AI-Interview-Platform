import express from "express";
import path from "path";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
const app = express();
const __dirname = path.resolve();
const PORT = process.env.PORT || 5000;
console.log(process.env.PORT);
app.get("/health", (req, res) => {
  res.status(200).json({ msg: "succ from  api" });
});
app.get("/books", (req, res) => {
  res.status(200).json({ msg: "succ from  book" });
});
if (ENV.NODE_ENV == "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
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
import express from "express";
import path from "path";
import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
const app = express();
const __dirname = path.resolve();
const PORT = ENV.PORT;
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



const startServer = async()=>{
  try{
   await connectDB();
   console.log(`Server on port ${PORT}`);
  }
   catch(error)
   {
      console.log("Error connecting to server",error)
   }
}

startServer();
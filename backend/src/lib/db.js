import dns from "node:dns/promises";
import mongoose from "mongoose";
import { ENV } from "./env.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const connectDB = async () => {
  const connection = await mongoose.connect(ENV.DB_URL);
  console.log("Connected to MongoDB", connection.connection.host);
};

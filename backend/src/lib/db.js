import mongoose from "mongoose";
import {ENV} from "./env.js"
import dns from "node:dns/promises";
dns.setServers(["1.1.1.1", "8.8.8.8","0.0.0.0"]);

export const connectDB = async () =>{
    try{
        const conn = await mongoose.connect(ENV.DB_URL);
        console.log("Connected to MongoDb",conn.connection.host);
    } catch(error)
    {
        console.error("Error connecting to MongoDB",error);
        process.exit(1);
    }
};
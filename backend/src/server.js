import express from "express";
import {ENV} from "./lib/env.js";



const app = express();
const PORT =ENV.PORT;
console.log(process.env.PORT)
app.get("/",(req,res)=>{
    res.status(200).json({msg:"succ from  api"})
})

app.listen(PORT,()=> console.log(`Server on port ${PORT}`));
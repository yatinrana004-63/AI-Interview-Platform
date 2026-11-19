import {StreamChat} from "stream-chat";
import {ENV} from "./env.js";

if(!apiKey || !apiSecret) {
    console.error("KEY Or SECRET Misiing");
}

export const chatClient = StreamChat.getInstance(apiKey,apiSecret);

export const upsertStreamUser = async(userData)=>{
    try{
        await chatClient.upsertUser(userData);
            console.error("User updated Success",userData);

        } catch(error) {
            console.error("Error upserting Stream user:",error);
        }
};

export const deleteStreamUser = async(userId)=>{
    try{
        await chatClient.deleteUser(userId)
           console.log("User deleted Success:",userId);
        } catch(error) {
            console.error("Error deleting Stream user:",error)
        }
};
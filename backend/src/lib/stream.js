
import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "./env.js";

const apiKey = ENV.STREAM_API_KEY;
const apiSecret = ENV.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("Stream API key or secret is missing");
}

export const streamClient = new StreamClient(
  apiKey,
  apiSecret
);

export const upsertStreamUser = async (userData) => {
  const response = await streamClient.upsertUsers([
    {
      id: userData.id,
      name: userData.name,
      image: userData.image,
      role: "user",
    },
  ]);

  console.log("Stream user synced:", userData.id);
  return response;
};

export const deleteStreamUser = async (userId) => {
  const response = await streamClient.deleteUsers({
    user_ids: [userId],
  });

  console.log("Stream user deleted:", userId);
  return response;
};

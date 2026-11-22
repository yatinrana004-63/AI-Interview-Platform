import { streamClient, upsertStreamUser } from "../lib/stream.js";

export async function getStreamToken(req, res) {
  const { clerkId, name, profileImage } = req.user;
  await upsertStreamUser({ id: clerkId, name, image: profileImage });
  res.set("Cache-Control", "no-store");
  res.json({
    apiKey: streamClient.apiKey,
    token: streamClient.generateUserToken({ user_id: clerkId }),
    userId: clerkId,
    userName: name,
    userImage: profileImage,
  });
}

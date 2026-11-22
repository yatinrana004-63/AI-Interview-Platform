import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/User.js";
import { getProfile, saveUser } from "../lib/userProfile.js";

export async function protectRoute(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Sign in to continue." });

  let user = await User.findOne({ clerkId: userId });

  if (!user) {
    const account = await clerkClient.users.getUser(userId);
    const email = account.primaryEmailAddress?.emailAddress ?? account.emailAddresses[0]?.emailAddress;
    if (!email) return res.status(422).json({ message: "Add an email address to your Clerk account first." });

    try {
      user = await saveUser(getProfile({
        id: userId,
        email,
        firstName: account.firstName,
        lastName: account.lastName,
        username: account.username,
        image: account.imageUrl,
      }));
    } catch (error) {
      if (error.code !== 11000) throw error;
      user = await User.findOne({ clerkId: userId });
      if (!user) return res.status(409).json({ message: "This email is already linked to a different account." });
    }
  }

  req.user = user;
  next();
}

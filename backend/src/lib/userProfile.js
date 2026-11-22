import User from "../models/User.js";

export function getProfile({ id, email, firstName, lastName, username, image }) {
  return {
    clerkId: id,
    email,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || username || email?.split("@")[0] || "Candidate",
    profileImage: image || "",
  };
}

export function saveUser(profile) {
  return User.findOneAndUpdate(
    { clerkId: profile.clerkId },
    { $set: profile },
    { upsert: true, new: true, runValidators: true },
  );
}

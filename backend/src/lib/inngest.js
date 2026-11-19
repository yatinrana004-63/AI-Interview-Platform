
import { Inngest } from "inngest";
import { connectDB } from "./db.js";
import User from "../models/User.js";

import {
  upsertStreamUser,
  deleteStreamUser,
} from "./stream.js";

export const inngest = new Inngest({
  id: "talent-iq",
});

// SYNC USER TO MONGODB AND STREAM
const syncUser = inngest.createFunction(
  { id: "sync-user" },
  { event: "clerk/user.created" },

  async ({ event, step }) => {
    const {
      id,
      email_addresses,
      primary_email_address_id,
      first_name,
      last_name,
      image_url,
    } = event.data;

    const primaryEmail = email_addresses?.find(
      (email) => email.id === primary_email_address_id
    );

    const email =
      primaryEmail?.email_address ??
      email_addresses?.[0]?.email_address;

    if (!id || !email) {
      throw new Error("Missing Clerk ID or email");
    }

    const newUser = {
      clerkId: id,
      email,
      name: `${first_name || ""} ${last_name || ""}`.trim(),
      profileImage: image_url || "",
    };

    // STEP 1: Save or update MongoDB user
    await step.run("sync-mongodb-user", async () => {
      await connectDB();

      await User.findOneAndUpdate(
        { clerkId: id },
        { $set: newUser },
        {
          upsert: true,
          runValidators: true,
        }
      );

      console.log("MongoDB user synced:", id);
    });

    // STEP 2: Save or update Stream user
    await step.run("sync-stream-user", async () => {
      await upsertStreamUser({
        id,
        name: newUser.name,
        image: newUser.profileImage,
      });

      console.log("Stream user synced:", id);
    });
  }
);

// DELETE USER FROM BOTH SERVICES
const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },

  async ({ event, step }) => {
    const { id } = event.data;

    if (!id) {
      throw new Error("Missing Clerk user ID");
    }

    await step.run("delete-mongodb-user", async () => {
      await connectDB();
      await User.deleteOne({ clerkId: id });
    });

    await step.run("delete-stream-user", async () => {
      await deleteStreamUser(id);
    });
  }
);

export const functions = [
  syncUser,
  deleteUserFromDB,
];

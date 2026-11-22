import { Inngest } from "inngest";
import User from "../models/User.js";
import { deleteStreamUser, upsertStreamUser } from "./stream.js";
import { getProfile, saveUser } from "./userProfile.js";

export const inngest = new Inngest({ id: "talent-iq" });

const syncUser = inngest.createFunction(
  { id: "sync-user", concurrency: { limit: 1, key: "event.data.id" } },
  [{ event: "clerk/user.created" }, { event: "clerk/user.updated" }],
  async ({ event, step }) => {
    const data = event.data;
    const email = data.email_addresses?.find(
      (address) => address.id === data.primary_email_address_id,
    )?.email_address ?? data.email_addresses?.[0]?.email_address;

    if (!data.id || !email) throw new Error("Missing Clerk ID or email");

    const profile = getProfile({
      id: data.id,
      email,
      firstName: data.first_name,
      lastName: data.last_name,
      username: data.username,
      image: data.image_url,
    });

    await step.run("sync-mongodb-user", async () => {
      await saveUser(profile);
    });

    await step.run("sync-stream-user", async () => {
      await upsertStreamUser({ id: data.id, name: profile.name, image: profile.profileImage });
    });
  },
);

const deleteUserFromDB = inngest.createFunction(
  { id: "delete-user-from-db" },
  { event: "clerk/user.deleted" },
  async ({ event, step }) => {
    const { id } = event.data;
    if (!id) throw new Error("Missing Clerk user ID");

    await step.run("delete-mongodb-user", async () => {
      await User.deleteOne({ clerkId: id });
    });

    await step.run("delete-stream-user", async () => {
      await deleteStreamUser(id);
    });
  },
);

export const functions = [syncUser, deleteUserFromDB];

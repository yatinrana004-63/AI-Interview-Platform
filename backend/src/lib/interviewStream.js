import { setTimeout as delay } from "node:timers/promises";
import { httpError } from "./http.js";
import { streamClient, upsertStreamUser } from "./stream.js";

const callType = "talentiq_interview";
const channelType = "talentiq-interview";
const videoGrants = {
  user: [],
  guest: [],
  call_member: ["read-call", "join-call", "send-video", "send-audio", "screenshare", "send-event"],
};
const chatGrants = {
  anonymous: [],
  user: [],
  guest: [],
  channel_member: ["read-channel", "read-channel-members", "create-message", "add-links"],
};
const settings = {
  limits: { max_participants: 2 },
  audio: { default_device: "speaker", mic_default_on: false },
  video: { enabled: true, camera_default_on: false, target_resolution: { width: 1280, height: 720 } },
  screensharing: { enabled: true },
  recording: { mode: "available", quality: "720p" },
};
let typesReady;

function statusOf(error) {
  return error.metadata?.responseCode ?? error.apiError?.StatusCode ?? error.status;
}

function missingCall(error) {
  return statusOf(error) === 404
    || (statusOf(error) === 400 && /does not exist|not found/i.test(error.apiError?.message || ""));
}

async function ensureType(get, create, update, isMissing) {
  try {
    await get();
  } catch (error) {
    if (!isMissing(error)) throw error;
    try {
      await create();
      return;
    } catch (creationError) {
      if (statusOf(creationError) !== 409 && !/already exists/i.test(creationError.apiError?.message || "")) {
        throw creationError;
      }
    }
  }
  await update();
}

function configureTypes() {
  const { video, chat } = streamClient;
  return Promise.all([
    ensureType(
      () => video.getCallType({ name: callType }),
      () => video.createCallType({ name: callType, grants: videoGrants, settings }),
      () => video.updateCallType({ name: callType, grants: videoGrants, settings }),
      missingCall,
    ),
    ensureType(
      () => chat.getChannelType({ name: channelType }),
      () => chat.createChannelType({
        name: channelType,
        grants: chatGrants,
        automod: "disabled",
        automod_behavior: "flag",
        max_message_length: 4000,
        connect_events: true,
      }),
      () => chat.updateChannelType({ name: channelType, grants: chatGrants, connect_events: true }),
      (error) => statusOf(error) === 404,
    ),
  ]);
}

async function streamRequest(action) {
  try {
    return await action();
  } catch (error) {
    console.error("Stream interview request failed", statusOf(error), error.code, error.apiError?.message || error.name);
    throw httpError(502, "Stream could not complete that request. Check the Stream app configuration and try again.");
  }
}

const callFor = (room) => streamClient.video.call(callType, room.id);

async function createCall(call, data) {
  for (const wait of [500, 1500, 3500, 5000]) {
    try {
      return await call.getOrCreate({ data });
    } catch (error) {
      if (statusOf(error) !== 404 || !/call type.*does not exist/i.test(error.apiError?.message || "")) throw error;
      // New Stream call types can take a few seconds to reach the call servers.
      await delay(wait);
    }
  }
  return call.getOrCreate({ data });
}

export function connectInterview(room, user) {
  return streamRequest(async () => {
    typesReady ??= configureTypes().catch((error) => {
      typesReady = undefined;
      throw error;
    });
    await typesReady;

    const { clerkId, name, profileImage } = user;
    await upsertStreamUser({ id: clerkId, name, image: profileImage });
    const callMembers = [room.hostId, room.guestId].filter(Boolean).map((user_id) => ({ user_id }));
    const call = callFor(room);
    const channel = streamClient.chat.channel(channelType, "interview-" + room.id);

    await Promise.all([
      createCall(call, {
        created_by_id: room.hostId,
        members: [{ user_id: room.hostId }],
        settings_override: settings,
      }).then(() => call.updateCallMembers({ update_members: callMembers })),
      channel.getOrCreate({ data: {
        created_by_id: room.hostId,
        members: [{ user_id: room.hostId }],
      } }).then(({ members }) => {
        if (room.guestId && !members?.some((member) => member.user_id === room.guestId)) {
          return channel.update({ add_members: [{ user_id: room.guestId }] });
        }
      }),
    ]);

    return {
      apiKey: streamClient.apiKey,
      callType,
      callId: room.id,
      channelType,
      channelId: channel.id,
      user: { id: clerkId, name, image: profileImage || undefined },
      videoToken: streamClient.generateCallToken({ user_id: clerkId, call_cids: [call.cid] }),
      chatToken: streamClient.generateUserToken({ user_id: clerkId }),
    };
  });
}

export const endInterview = (room) => streamRequest(async () => {
  try {
    await callFor(room).end();
  } catch (error) {
    if (!missingCall(error)) throw error;
  }
});

export const setRecording = (room, record) => streamRequest(async () => {
  const call = callFor(room);
  const options = { recording_type: "composite" };
  if (record) await call.startRecording(options);
  else await call.stopRecording(options);
});

export const getRecordings = (room) => streamRequest(async () => {
  try {
    const { recordings } = await callFor(room).listRecordings();
    return recordings.map(({ filename, url, start_time }) => ({ filename, url, startedAt: start_time }));
  } catch (error) {
    if (missingCall(error)) return [];
    throw error;
  }
});

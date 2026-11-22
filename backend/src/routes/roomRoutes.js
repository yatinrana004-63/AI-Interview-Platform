import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { httpError, limitPerUser } from "../lib/http.js";
import { connectInterview, endInterview, getRecordings, setRecording } from "../lib/interviewStream.js";
import { protectRoute } from "../middleware/protectRoute.js";
import InterviewRoom from "../models/InterviewRoom.js";

const router = Router();
router.use(protectRoute);

function serializeRoom(room, userId) {
  const isHost = room.hostId === userId;
  return {
    id: room.id,
    title: room.title,
    status: room.status,
    occupied: room.guestId ? 2 : 1,
    isHost,
    invite: isHost && room.status === "open" ? room.invite : undefined,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

function isMember(room, userId) {
  return room.hostId === userId || room.guestId === userId;
}

function verifyInvite(expected, received) {
  if (typeof received !== "string" || !/^[a-f0-9]{32}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

async function findRoom(id) {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw httpError(404, "Interview room not found.");
  const room = await InterviewRoom.findById(id).select("+invite");
  if (!room) throw httpError(404, "Interview room not found.");
  return room;
}

async function memberRoom(req) {
  const room = await findRoom(req.params.id);
  if (!isMember(room, req.user.clerkId)) throw httpError(403, "Join with an interview invitation first.");
  return room;
}

router.get("/", async (req, res) => {
  const userId = req.user.clerkId;
  const rooms = await InterviewRoom.find({ $or: [{ hostId: userId }, { guestId: userId }] })
    .sort({ updatedAt: -1 }).limit(50);
  res.json(rooms.map((room) => serializeRoom(room, userId)));
});

router.post("/", limitPerUser(8, 60_000), async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title || title.length > 80) throw httpError(400, "Enter a room name under 80 characters.");

  const room = await InterviewRoom.create({
    title,
    hostId: req.user.clerkId,
    invite: randomBytes(16).toString("hex"),
  });
  res.status(201).json(serializeRoom(room, req.user.clerkId));
});

router.get("/:id", async (req, res) => {
  res.json(serializeRoom(await memberRoom(req), req.user.clerkId));
});

router.post("/:id/join", limitPerUser(12, 60_000), async (req, res) => {
  const userId = req.user.clerkId;
  let room = await findRoom(req.params.id);
  if (room.status === "ended") throw httpError(409, "This interview has ended.");

  if (!isMember(room, userId)) {
    if (!verifyInvite(room.invite, req.body?.invite)) throw httpError(403, "This invitation is invalid.");
    room = await InterviewRoom.findOneAndUpdate(
      { _id: room.id, status: "open", $or: [{ guestId: null }, { guestId: userId }] },
      { $set: { guestId: userId } },
      { new: true },
    ).select("+invite");
    if (!room) throw httpError(409, "This interview is full or has ended.");
  }

  res.json(serializeRoom(room, userId));
});

router.post("/:id/connection", limitPerUser(12, 60_000), async (req, res) => {
  const room = await memberRoom(req);
  if (room.status === "ended") throw httpError(409, "This interview has ended.");
  const connection = await connectInterview(room, req.user);
  if (!await InterviewRoom.exists({ _id: room.id, status: "open" })) {
    await endInterview(room);
    throw httpError(409, "This interview has ended.");
  }
  res.set("Cache-Control", "no-store");
  res.json(connection);
});

router.post("/:id/end", async (req, res) => {
  const room = await memberRoom(req);
  if (room.hostId !== req.user.clerkId) throw httpError(403, "Only the host can end the interview.");
  if (room.status === "open") {
    await endInterview(room);
    await InterviewRoom.updateOne({ _id: room.id }, { $set: { status: "ended" } });
    room.status = "ended";
  }
  res.json(serializeRoom(room, req.user.clerkId));
});

router.put("/:id/recording", limitPerUser(8, 60_000), async (req, res) => {
  const room = await memberRoom(req);
  if (room.hostId !== req.user.clerkId) throw httpError(403, "Only the host can record the interview.");
  if (room.status === "ended") throw httpError(409, "This interview has ended.");
  if (typeof req.body?.record !== "boolean") throw httpError(400, "Choose whether to start or stop recording.");
  await setRecording(room, req.body.record);
  res.status(204).end();
});

router.get("/:id/recordings", async (req, res) => {
  const room = await memberRoom(req);
  res.set("Cache-Control", "no-store");
  res.json(await getRecordings(room));
});

export default router;

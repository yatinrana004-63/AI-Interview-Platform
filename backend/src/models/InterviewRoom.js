import mongoose from "mongoose";

const interviewRoomSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 80 },
  hostId: { type: String, required: true },
  guestId: { type: String, default: null },
  invite: { type: String, required: true, select: false },
  status: { type: String, enum: ["open", "ended"], default: "open" },
}, { timestamps: true });

interviewRoomSchema.index({ hostId: 1, updatedAt: -1 });
interviewRoomSchema.index({ guestId: 1, updatedAt: -1 });

export default mongoose.model("InterviewRoom", interviewRoomSchema);

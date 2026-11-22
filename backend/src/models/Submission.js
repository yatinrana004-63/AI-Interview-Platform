import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  problemSlug: { type: String, required: true },
  language: { type: String, required: true, enum: ["javascript", "python"] },
  passed: { type: Boolean, required: true },
  passedCount: { type: Number, required: true },
  totalCount: { type: Number, required: true },
}, { timestamps: true });

submissionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Submission", submissionSchema);

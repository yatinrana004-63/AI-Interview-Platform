import { Router } from "express";
import { findProblem, listProblems } from "../data/problems.js";
import { httpError, limitPerUser } from "../lib/http.js";
import { judgeSubmission, supportsLanguage } from "../lib/judge.js";
import { protectRoute } from "../middleware/protectRoute.js";
import InterviewRoom from "../models/InterviewRoom.js";
import Submission from "../models/Submission.js";

const router = Router();

router.get("/problems", (_req, res) => res.json(listProblems()));
router.use(protectRoute);

router.get("/dashboard", async (req, res) => {
  const userId = req.user.clerkId;
  const rooms = { $or: [{ hostId: userId }, { guestId: userId }] };
  const [attempts, solved, submissions, activeRooms, completedRooms] = await Promise.all([
    Submission.countDocuments({ userId }),
    Submission.distinct("problemSlug", { userId, passed: true }),
    Submission.find({ userId }).sort({ createdAt: -1 }).limit(8).lean(),
    InterviewRoom.countDocuments({ ...rooms, status: "open" }),
    InterviewRoom.countDocuments({ ...rooms, status: "ended" }),
  ]);
  res.json({ attempts, solved, submissions, activeRooms, completedRooms });
});

router.post("/problems/:slug/run", limitPerUser(5, 60_000), async (req, res) => {
  const problem = findProblem(req.params.slug);
  if (!problem) throw httpError(404, "Problem not found.");

  const { code, language, submit = false } = req.body ?? {};
  if (!supportsLanguage(language) || typeof code !== "string" || !code.trim()
    || code.length > 24_000 || typeof submit !== "boolean") {
    throw httpError(400, "Provide JavaScript or Python code under 24,000 characters.");
  }

  const result = await judgeSubmission({ language, code, problem, submit });
  if (submit) {
    await Submission.create({
      userId: req.user.clerkId,
      problemSlug: problem.slug,
      language,
      passed: result.passed,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
    });
  }
  res.json(result);
});

export default router;

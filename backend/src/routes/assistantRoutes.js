import { Router } from "express";
import { ENV } from "../lib/env.js";
import { httpError, limitPerUser } from "../lib/http.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = Router();
const topics = new Set(["Data structures", "System design", "Behavioral"]);
const systemPrompt = "You are an interview coach for software engineers. Ask one question at a time. "
  + "After each answer, offer specific, concise feedback and ask a follow-up question. "
  + "When asked to wrap up, provide strengths, gaps, and actionable next steps. "
  + "Never request private credentials or personal information.";

router.post("/", protectRoute, limitPerUser(12, 60_000), async (req, res) => {
  const { topic, messages } = req.body ?? {};
  if (!topics.has(topic) || !Array.isArray(messages) || !messages.length || messages.length > 21
    || messages.some((message, index) => message?.role !== (index % 2 ? "assistant" : "user")
      || typeof message.text !== "string" || !message.text.trim() || message.text.length > 4000)
    || messages.at(-1).role !== "user") {
    throw httpError(400, "Choose an interview topic and provide a valid conversation.");
  }
  if (!ENV.GEMINI_API_KEY) throw httpError(503, "The AI interviewer is awaiting Gemini configuration.");

  let response;
  let payload;
  try {
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(ENV.GEMINI_MODEL) + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": ENV.GEMINI_API_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt + " Interview topic: " + topic }] },
          contents: messages.map(({ role, text }) => ({
            role: role === "assistant" ? "model" : "user",
            parts: [{ text }],
          })),
          generationConfig: { maxOutputTokens: 1400 },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );
    payload = await response.json();
  } catch {
    throw httpError(502, "The AI interviewer did not respond. Try again.");
  }
  if (response.status === 429) throw httpError(429, "The AI interviewer reached its quota. Try again later.");
  if (!response.ok) throw httpError(502, "The AI provider returned an error.");

  const reply = payload.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text).join("\n").trim();
  if (!reply) throw httpError(502, "The AI interviewer returned an empty response. Try again.");
  res.json({ reply });
});

export default router;

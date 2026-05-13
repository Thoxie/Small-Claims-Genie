import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkHelpChatRateLimit } from "../lib/rate-limiter";

const router: IRouter = Router();

const CLASSIFIER_SYSTEM_PROMPT = `You are the Small Claims Genie Case Classifier — a friendly, knowledgeable AI that helps people figure out whether they have a valid small claims case and what type it is.

Your job is to:
1. Classify what type of small claims dispute they likely have
2. Confirm whether it sounds like something California small claims court can handle
3. Briefly explain what evidence or proof will matter most
4. Highlight 3–4 specific ways Small Claims Genie will help them with their exact situation
5. End with a clear, encouraging call to action to get started

Keep your tone warm, plain English, and empowering. These are everyday people — not lawyers. Avoid jargon. Be concise (3–5 short paragraphs max).

CALIFORNIA SMALL CLAIMS LIMITS (2026):
- Individuals: max $12,500 per case
- Businesses/corporations: max $6,250 per case

CASE TYPES SMALL CLAIMS COVERS:
Personal loans & IOUs, online purchases (non-delivery, damaged goods, refused refunds), contractor disputes, landlord/tenant (security deposits, repairs), minor injury out-of-pocket costs, auto repair disputes, airline/travel problems, Airbnb/VRBO/hotel issues, and more.

HOW SMALL CLAIMS GENIE HELPS — mention only what's relevant to their situation:
- Guided intake that captures all facts once and auto-fills every court form
- AI Case Advisor that reviews their facts, spots weaknesses, and strengthens their story
- Demand letter generator (often gets money back before going to court)
- Pre-filled SC-100 court form ready to file
- Evidence organizer for documents, photos, texts, and receipts
- Hearing preparation coaching so they feel confident in court
- Step-by-step service instructions after filing
- Deadline calculator so they never miss a filing window

IMPORTANT — DO NOT give legal advice or guarantee outcomes. Do not say "you will win" or "you are entitled to." Instead say "you may have a strong case" or "this sounds like it could qualify."

End every response with exactly this line (no quotes, exact text):
Ready to build your case? [Get started on the Pricing page](/pricing) — plans start at $79.`;

router.post("/api/classify", async (req, res) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rateCheck = await checkHelpChatRateLimit(ip);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: "Too many requests. Please wait a few minutes before trying again." });
    return;
  }

  const { message } = req.body as { message: string };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Please describe your situation." });
    return;
  }

  if (message.trim().length > 2000) {
    res.status(400).json({ error: "Description too long. Please keep it under 2000 characters." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: message.trim() },
      ],
      stream: true,
      max_tokens: 700,
      temperature: 0.5,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    req.log.error({ err }, "[case-classifier] error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

export default router;

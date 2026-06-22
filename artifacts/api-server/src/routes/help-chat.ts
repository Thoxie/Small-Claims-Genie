import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkHelpChatRateLimit } from "../lib/rate-limiter";
import { db, genieConversionsTable } from "@workspace/db";
import { VISITOR_PROMPT, VISITOR_SUGGESTIONS_INSTRUCTION, HELP_BASE_PROMPT, PAGE_CONTEXT_PROMPTS, SUGGESTIONS_INSTRUCTION } from "../prompts/help-chat-prompt";

const router: IRouter = Router();


router.post("/help", async (req, res): Promise<void> => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rateCheck = await checkHelpChatRateLimit(ip);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: "Too many requests. Please wait a few minutes before trying again." });
    return;
  }

  const { message, history = [], pageContext, isSignedIn, jurisdictionState } = req.body as {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    pageContext?: string;
    isSignedIn?: boolean;
    jurisdictionState?: string;
  };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (message.trim().length > 2000) {
    res.status(400).json({ error: "Message too long" });
    return;
  }

  let systemPrompt: string;
  if (isSignedIn === false) {
    systemPrompt = VISITOR_PROMPT + "\n\n" + VISITOR_SUGGESTIONS_INSTRUCTION;
  } else {
    const pageAddendum = pageContext && PAGE_CONTEXT_PROMPTS[pageContext]
      ? PAGE_CONTEXT_PROMPTS[pageContext] + SUGGESTIONS_INSTRUCTION
      : SUGGESTIONS_INSTRUCTION;
    const stateName = jurisdictionState === "FL" ? "Florida" : jurisdictionState === "TX" ? "Texas" : jurisdictionState;
    const stateNote = jurisdictionState && jurisdictionState !== "CA"
      ? `\n\nUser's case jurisdiction: ${stateName} (${jurisdictionState}). Apply ${stateName}-specific rules, limits, and procedures when answering questions about this case.`
      : "";
    systemPrompt = HELP_BASE_PROMPT + stateNote + "\n\n" + pageAddendum;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const SUGGESTIONS_SEP_HG = "\nSUGGESTIONS:";
  const REDIRECT_SEP_HG = "\nREDIRECT:";
  const sanitizeHistory = (content: string): string => {
    let c = content;
    const ridx = c.indexOf(REDIRECT_SEP_HG);
    if (ridx !== -1) c = c.slice(0, ridx).trimEnd();
    const sidx = c.indexOf(SUGGESTIONS_SEP_HG);
    if (sidx !== -1) c = c.slice(0, sidx).trimEnd();
    return c;
  };

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map(m => ({ role: m.role, content: sanitizeHistory(m.content) })),
      { role: "user", content: message.trim() },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_tokens: 600,
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
    req.log.error({ err }, "[help-chat] error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
    res.end();
  }
});

router.post("/help/conversion", async (req, res): Promise<void> => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const rateCheck = await checkHelpChatRateLimit(ip);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: "Too many requests." });
    return;
  }

  const { question, answerSnippet } = req.body as {
    question?: string;
    answerSnippet?: string;
  };

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "question is required" });
    return;
  }

  try {
    await db.insert(genieConversionsTable).values({
      question: question.trim().slice(0, 500),
      answerSnippet: answerSnippet ? answerSnippet.trim().slice(0, 400) : null,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "[help-conversion] db insert failed");
    res.status(500).json({ error: "Failed to record conversion" });
  }
});

export default router;

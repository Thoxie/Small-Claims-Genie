import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkHelpChatRateLimit } from "../lib/rate-limiter";
import { db, genieConversionsTable } from "@workspace/db";
import { VISITOR_PROMPT, VISITOR_SUGGESTIONS_INSTRUCTION, HELP_BASE_PROMPT, PAGE_CONTEXT_PROMPTS, SUGGESTIONS_INSTRUCTION } from "../prompts/help-chat-prompt";

const router: IRouter = Router();

// Deterministic guardrail (code-level, not prompt-level) for a specific
// failure mode observed at ~100% reproducibility: a pure defendant with no
// counterclaim gets an answer that legitimately discusses "the hearing" /
// "evidence" to defend themselves, and that answer text pattern-matches the
// Hearing Prep / Evidence Upload feature-table rows strongly enough that the
// model's own FEATURE_TAG self-check consistently overrides the "defendant
// with no counterclaim = NONE" instruction. Prompt-only tuning (self-check
// wording, worked examples matching this exact scenario) did not change the
// outcome across repeated samples, so this narrow, additive check forces the
// tag back to NONE only when the user's own message clearly describes a
// one-sided lawsuit against them with no counterclaim/owed-money language.
// It only ever downgrades a tag to NONE — it never upgrades, removes a
// legitimate plaintiff-side pitch, or fires on messages that don't match.
const HELP_CHAT_TAG_MARKER = "FEATURE_TAG:";

const DEFENDANT_SIGNALS = [
  "being sued",
  "got served",
  "i was served",
  "i've been served",
  "served with a lawsuit",
  "served with a small claims",
  "sued me",
  "suing me",
  "lawsuit against me",
  "case against me",
  "respond to a lawsuit",
  "respond to a small claims",
  "i am the defendant",
  "i'm the defendant",
  "i am a defendant",
  "i'm a defendant",
  "named as a defendant",
  "named as the defendant",
];

const COUNTERCLAIM_SIGNALS = [
  "counterclaim",
  "counter claim",
  "counter-claim",
  "owes me",
  "owe me",
  "they owe",
  "he owes",
  "she owes",
  "sue them back",
  "sue him back",
  "sue her back",
  "my own claim",
  "separate claim",
  "separate dispute",
  "separate deal",
  "claim of my own",
];

function isPureDefendantNoCounterclaim(message: string): boolean {
  const m = message.toLowerCase();
  const hasDefendantSignal = DEFENDANT_SIGNALS.some((s) => m.includes(s));
  if (!hasDefendantSignal) return false;
  const hasCounterclaimSignal = COUNTERCLAIM_SIGNALS.some((s) => m.includes(s));
  return !hasCounterclaimSignal;
}

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
    const stateName = jurisdictionState === "FL" ? "Florida" : jurisdictionState === "TX" ? "Texas" : jurisdictionState === "IL" ? "Illinois" : jurisdictionState === "NC" ? "North Carolina" : jurisdictionState === "VA" ? "Virginia" : jurisdictionState === "NJ" ? "New Jersey" : jurisdictionState === "WA" ? "Washington" : jurisdictionState;
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
      max_tokens: 750,
      temperature: 0.5,
    });

    const guardrailActive = isSignedIn === false && isPureDefendantNoCounterclaim(message.trim());

    if (!guardrailActive) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }
    } else {
      // Buffer only around the FEATURE_TAG line so the answer prose above it
      // still streams live; everything before/after the tag line passes
      // through unmodified.
      let acc = "";
      let sentLen = 0;
      let tagHandled = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (!delta) continue;
        acc += delta;

        if (tagHandled) {
          if (acc.length > sentLen) {
            res.write(`data: ${JSON.stringify({ content: acc.slice(sentLen) })}\n\n`);
            sentLen = acc.length;
          }
          continue;
        }

        const markerIdx = acc.indexOf(HELP_CHAT_TAG_MARKER, sentLen);
        if (markerIdx === -1) {
          // No marker seen yet; hold back a small tail in case it's a
          // partial marker split across chunks.
          const safeLen = Math.max(sentLen, acc.length - HELP_CHAT_TAG_MARKER.length);
          if (safeLen > sentLen) {
            res.write(`data: ${JSON.stringify({ content: acc.slice(sentLen, safeLen) })}\n\n`);
            sentLen = safeLen;
          }
          continue;
        }

        const afterMarker = acc.slice(markerIdx + HELP_CHAT_TAG_MARKER.length);
        const nlIdx = afterMarker.indexOf("\n");
        if (nlIdx === -1) {
          // Tag line not fully received yet; wait for the rest.
          continue;
        }

        const before = acc.slice(sentLen, markerIdx);
        if (before) {
          res.write(`data: ${JSON.stringify({ content: before })}\n\n`);
        }

        const originalTag = afterMarker.slice(0, nlIdx).trim();
        if (originalTag !== "NONE") {
          req.log.info(
            { originalTag },
            "[help-chat] guardrail overrode FEATURE_TAG to NONE for defendant-no-counterclaim message",
          );
        }
        res.write(`data: ${JSON.stringify({ content: `${HELP_CHAT_TAG_MARKER} NONE\n` })}\n\n`);
        sentLen = markerIdx + HELP_CHAT_TAG_MARKER.length + nlIdx + 1;
        tagHandled = true;
      }

      if (acc.length > sentLen) {
        res.write(`data: ${JSON.stringify({ content: acc.slice(sentLen) })}\n\n`);
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

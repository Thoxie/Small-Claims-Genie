import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import multer from "multer";
import { db } from "@workspace/db";
import { casesTable, chatMessagesTable, documentsTable } from "@workspace/db";
import { SendChatMessageBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getUserId, getOwnedCase } from "../lib/owned-case";
import { checkAiRateLimit, checkWriteRateLimit } from "../lib/rate-limiter";
import { isOnTopic, OFF_TOPIC_REPLY } from "../lib/topic-guard";
import { buildCaseContext } from "../lib/case-context";
import { SYSTEM_PROMPT, PAGE_CONTEXT_PROMPTS, SUGGESTIONS_INSTRUCTION } from "../prompts/chat-prompt";

const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm", "audio/mp4", "audio/ogg", "audio/wav",
  "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/m4a",
  "audio/flac", "video/webm", "video/mp4",
]);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Strip codec parameters (e.g. "audio/webm;codecs=opus" → "audio/webm")
    const base = file.mimetype.split(";")[0].trim();
    if (ALLOWED_AUDIO_MIMES.has(base)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type "${file.mimetype}".`));
    }
  },
});

const router: IRouter = Router();

router.get("/cases/:id/chat", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, id))
    .orderBy(asc(chatMessagesTable.createdAt));

  res.json(messages);
});

router.post("/cases/:id/chat", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkAiRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `You've used your AI allowance for this hour. Try again in ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes.`, code: "RATE_LIMITED", retryAfterMinutes: Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60) });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }

  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  const pageContext = typeof req.body?.pageContext === "string" ? req.body.pageContext as string : undefined;

  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const onTopic = await isOnTopic(parsed.data.content);
  if (!onTopic) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    await db.insert(chatMessagesTable).values({ caseId: id, role: "user", content: parsed.data.content });
    await db.insert(chatMessagesTable).values({ caseId: id, role: "assistant", content: OFF_TOPIC_REPLY });
    res.write(`data: ${JSON.stringify({ content: OFF_TOPIC_REPLY })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  const [caseRecord] = await db.select().from(casesTable).where(eq(casesTable.id, id));
  if (!caseRecord) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  const docs = await db.select().from(documentsTable).where(eq(documentsTable.caseId, id));
  const history = req.query.fresh === '1' ? [] : await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.caseId, id))
    .orderBy(asc(chatMessagesTable.createdAt));

  await db.insert(chatMessagesTable).values({
    caseId: id,
    role: "user",
    content: parsed.data.content,
  });

  const { context: caseContext } = buildCaseContext(caseRecord, docs, { docCharLimit: 6000 });

  const pageAddendum = pageContext && PAGE_CONTEXT_PROMPTS[pageContext]
    ? PAGE_CONTEXT_PROMPTS[pageContext] + SUGGESTIONS_INSTRUCTION
    : SUGGESTIONS_INSTRUCTION;

  const recentHistory = history.slice(-20);
  const freshnessReminder = recentHistory.length > 0
    ? `[SYSTEM REMINDER: The case record above was just fetched live from the database. It is the ONLY authoritative source for dollar amounts, dates, and case facts. Any amounts or issues mentioned in the conversation below that differ from the case record above are STALE — do not repeat or re-raise them. Read all figures directly from the case record above.]`
    : null;

  const chatMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT + "\n\n" + caseContext + (freshnessReminder ? "\n\n" + freshnessReminder : "") + "\n\n" + pageAddendum },
    ...recentHistory.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: parsed.data.content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  const SUGGESTIONS_SEP = "\nSUGGESTIONS:";
  const REDIRECT_SEP = "\nREDIRECT:";
  let cleanResponse = fullResponse.includes(REDIRECT_SEP)
    ? fullResponse.split(REDIRECT_SEP)[0].trimEnd()
    : fullResponse;
  cleanResponse = cleanResponse.includes(SUGGESTIONS_SEP)
    ? cleanResponse.split(SUGGESTIONS_SEP)[0].trimEnd()
    : cleanResponse;

  await db.insert(chatMessagesTable).values({
    caseId: id,
    role: "assistant",
    content: cleanResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/cases/:id/chat/voice", audioUpload.single("audio"), async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkWriteRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }
  if (!req.file) { res.status(400).json({ error: "No audio file provided" }); return; }

  const mimeType = req.file.mimetype;
  const ext =
    mimeType.includes("mp4") || mimeType.includes("m4a") ? "mp4"
    : mimeType.includes("aac")  ? "aac"
    : mimeType.includes("ogg")  ? "ogg"
    : mimeType.includes("wav")  ? "wav"
    : mimeType.includes("mpeg") ? "mp3"
    : mimeType.includes("flac") ? "flac"
    : "webm";

  const audioFile = new File([new Uint8Array(req.file.buffer)], `recording.${ext}`, { type: mimeType });
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });
    res.json({ text: transcription.text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: `Voice transcription failed: ${msg}. Please type your message instead.` });
  }
});

router.delete("/cases/:id/chat", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }
  const ownedCase = await getOwnedCase(id, userId);
  if (!ownedCase) { res.status(404).json({ error: "Case not found" }); return; }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.caseId, id));
  res.sendStatus(204);
});

export default router;

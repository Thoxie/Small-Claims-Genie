import { Router, type IRouter } from "express";
import multer from "multer";
import { openai } from "@workspace/integrations-openai-ai-server";
import { checkWriteRateLimit } from "../lib/rate-limiter";
import { getUserId } from "../lib/owned-case";

const router: IRouter = Router();

// Whisper-supported audio formats. Include video/webm and video/mp4 because
// some browsers label audio-only MediaRecorder output with a video/* MIME type.
const ALLOWED_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/aac",
  "audio/x-m4a",
  "audio/m4a",
  "audio/flac",
  "video/webm",
  "video/mp4",
]);

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — ample for short voice recordings
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type "${file.mimetype}". Allowed: webm, mp4, ogg, wav, mp3, aac, m4a.`));
    }
  },
});

router.post("/transcribe", audioUpload.single("audio"), async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const rateCheck = await checkWriteRateLimit(userId);
  if (!rateCheck.allowed) {
    res.status(429).json({ error: `Too many requests. Please wait ${Math.ceil((rateCheck.retryAfterSec ?? 3600) / 60)} minutes before trying again.` });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

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

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "en",
  });

  res.json({ text: transcription.text });
});

export default router;

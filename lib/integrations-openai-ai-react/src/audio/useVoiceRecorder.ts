/**
 * React hook for voice recording using MediaRecorder API.
 * Negotiates a supported MIME type across browsers (Chrome, Firefox, Safari).
 * Resets to "idle" after each recording so multiple sessions work correctly.
 */
import { useRef, useCallback, useState } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const mimeType of PREFERRED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      // Some browsers throw on unsupported types
    }
  }
  return undefined;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    // Always clean up any leftover stream from a previous session
    stopAllTracks();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("[VoiceRecorder] getUserMedia failed:", err);
      setState("idle");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;

    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      console.error("[VoiceRecorder] MediaRecorder creation failed:", err);
      stopAllTracks();
      setState("idle");
      return;
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = (e) => {
      console.error("[VoiceRecorder] MediaRecorder error:", e);
      stopAllTracks();
      setState("idle");
    };

    recorder.start(100);
    setState("recording");
  }, [stopAllTracks]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        stopAllTracks();
        setState("idle");
        resolve(new Blob());
        return;
      }

      recorder.onstop = () => {
        const blobType = mimeTypeRef.current ?? recorder.mimeType ?? "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        stopAllTracks();
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        // Reset to idle so the next hold-to-talk works immediately
        setState("idle");
        resolve(blob);
      };

      recorder.stop();
    });
  }, [stopAllTracks]);

  return { state, startRecording, stopRecording };
}

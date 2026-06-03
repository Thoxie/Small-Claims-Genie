/**
 * Real-time speech-to-text hook using the browser's Web Speech API.
 * Words appear in the input field as the user speaks (interim results).
 * On stop, the final committed transcript is delivered via onFinal.
 *
 * Browser support: Chrome/Edge (full), Safari 15+ (partial), Firefox (unsupported).
 */
import { useRef, useCallback } from "react";

export function useWebSpeech() {
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const finalAccumRef = useRef("");

  const isSupported =
    typeof window !== "undefined" &&
    !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );

  const startListening = useCallback(
    (
      baseText: string,
      onInterim: (text: string) => void,
      onFinal: (text: string) => void,
      onError?: (message: string) => void,
    ): boolean => {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) {
        onError?.(
          "Real-time speech is not supported in this browser. Please use Chrome or Edge.",
        );
        return false;
      }

      baseTextRef.current = baseText;
      finalAccumRef.current = "";

      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let interimChunk = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const word = transcript.trim();
            if (word) {
              finalAccumRef.current = finalAccumRef.current
                ? `${finalAccumRef.current} ${word}`
                : word;
            }
          } else {
            interimChunk = transcript;
          }
        }
        const parts = [
          baseTextRef.current,
          finalAccumRef.current,
          interimChunk.trim(),
        ]
          .filter(Boolean)
          .join(" ");
        onInterim(parts);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") return;
        onError?.(
          event.error === "not-allowed"
            ? "Microphone access was denied. Please allow mic access in your browser settings."
            : "Voice recognition error. Please try again.",
        );
      };

      recognition.onend = () => {
        const parts = [baseTextRef.current, finalAccumRef.current]
          .filter(Boolean)
          .join(" ");
        onFinal(parts || baseTextRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    },
    [],
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  return { isSupported, startListening, stopListening };
}

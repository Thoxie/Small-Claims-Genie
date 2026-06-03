import { fetch } from "expo/fetch";

export async function streamSSE(
  url: string,
  options: RequestInit,
  onChunk: (content: string) => void,
  onDone?: () => void,
): Promise<void> {
  const response = await fetch(url, options as Parameters<typeof fetch>[1]);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let msg = `HTTP ${response.status}`;
    try {
      const j = JSON.parse(text);
      if (j?.error) msg = j.error;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (typeof parsed.content === "string") onChunk(parsed.content);
          if (parsed.done === true) onDone?.();
        } catch {
          // ignore malformed SSE
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone?.();
}

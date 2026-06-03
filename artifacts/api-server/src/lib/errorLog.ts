export interface ErrorEntry {
  id: number;
  timestamp: string;
  level: "error" | "warn";
  message: string;
  route?: string;
  method?: string;
  statusCode?: number;
  stack?: string;
}

const MAX_ENTRIES = 100;
const ring: ErrorEntry[] = [];
let seq = 0;

export function pushError(entry: Omit<ErrorEntry, "id" | "timestamp">): void {
  ring.push({
    id: ++seq,
    timestamp: new Date().toISOString(),
    ...entry,
    stack: entry.stack?.split("\n").slice(0, 5).join("\n"),
  });
  if (ring.length > MAX_ENTRIES) ring.shift();
}

export function getErrors(): ErrorEntry[] {
  return [...ring].reverse();
}

export function clearErrors(): void {
  ring.length = 0;
}

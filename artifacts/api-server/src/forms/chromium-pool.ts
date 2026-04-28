import { execSync } from "child_process";
import { chromium, type Browser, type Page } from "playwright-core";

let cachedBrowser: Browser | null = null;
let launchPromise: Promise<Browser> | null = null;
let shutdownHooksRegistered = false;
let activePages = 0;
let draining = false;

const SHUTDOWN_DRAIN_MS = 5_000;

function findChromium(): string {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  try {
    return execSync(
      "which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null",
      { encoding: "utf8" }
    )
      .trim()
      .split("\n")[0];
  } catch {
    throw new Error("Chromium not found. Set CHROMIUM_PATH environment variable.");
  }
}

function isBrowserDisconnectError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /Target page, context or browser has been closed/i.test(msg) ||
    /Browser has been closed/i.test(msg) ||
    /Target closed/i.test(msg) ||
    /Browser closed/i.test(msg) ||
    /disconnected/i.test(msg) ||
    /Protocol error.*Connection closed/i.test(msg)
  );
}

async function waitForDrain(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (activePages > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }
}

function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) return;
  shutdownHooksRegistered = true;
  const close = async () => {
    draining = true;
    const b = cachedBrowser;
    cachedBrowser = null;
    if (!b) return;
    try {
      await waitForDrain(SHUTDOWN_DRAIN_MS);
      await b.close();
    } catch {
      // ignore
    }
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  process.once("beforeExit", close);
}

async function launchBrowser(): Promise<Browser> {
  const executablePath = findChromium();
  const browser = await chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  browser.on("disconnected", () => {
    if (cachedBrowser === browser) {
      cachedBrowser = null;
    }
  });
  return browser;
}

export async function getBrowser(): Promise<Browser> {
  registerShutdownHooks();
  if (draining) {
    throw new Error("Chromium pool is shutting down");
  }
  if (cachedBrowser && cachedBrowser.isConnected()) {
    return cachedBrowser;
  }
  if (launchPromise) {
    return launchPromise;
  }
  launchPromise = (async () => {
    try {
      const b = await launchBrowser();
      cachedBrowser = b;
      return b;
    } finally {
      launchPromise = null;
    }
  })();
  return launchPromise;
}

async function runOnce<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  activePages++;
  try {
    return await fn(page);
  } finally {
    activePages--;
    try {
      await page.close();
    } catch {
      // ignore
    }
  }
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  try {
    return await runOnce(fn);
  } catch (err) {
    if (!isBrowserDisconnectError(err)) throw err;
    cachedBrowser = null;
    return await runOnce(fn);
  }
}

export async function warmupBrowser(): Promise<void> {
  try {
    await getBrowser();
  } catch (err) {
    console.warn("[chromium-pool] warmup failed:", err);
  }
}

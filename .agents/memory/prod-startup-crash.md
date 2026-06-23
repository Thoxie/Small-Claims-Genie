---
name: Production startup crash
description: pg library emits unhandled error events on DB connections during startup; crashes process before health probe passes unless global handlers are in place.
---

## The rule
`index.ts` must register `process.on("uncaughtException")` and `process.on("unhandledRejection")` at the very top — before any imports trigger DB work — to prevent process crashes during the Cloud Run startup probe window.

**Why:** The `pg` library (and `stripe-replit-sync`) emit `error` events on pool connections (SSL parse failures, auth timeouts, transient connection resets). Node.js converts unhandled EventEmitter `error` events to uncaught exceptions. If the process crashes within the startup probe window, Cloud Run fails the deployment even though the code and build are healthy. The server crashed 777ms into first boot in production; the second boot was healthy, but crash+restart exceeded the probe timeout.

**How to apply:** The handlers should log the error (using `logger`) and let the server continue. They are a safety net only — `initStripe()`'s existing try/catch still handles expected DB errors. The global handlers catch unexpected unhandled throws from third-party libraries.

```ts
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server continuing");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — server continuing");
});
```

These must be registered BEFORE `app.listen()` and BEFORE any async initialization begins.

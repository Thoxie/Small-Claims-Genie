# Agent Self-Improvement: Debugging Methodology & Self-Test System

## Origin
Derived from a production Stripe debugging session (May 12, 2026) where three sequential root-cause failures were uncovered. This skill encodes lessons learned into a reusable checklist and self-evaluation protocol.

---

## Part 1 — Lessons Learned From the Session

### Failure 1: Declaring "working" without end-to-end verification
**What happened:** Staging was confirmed working (products endpoint 200, checkout 200). The agent told the user "republish and it will work." Production still failed.
**Root cause:** Staging DB had pre-existing Stripe tables from a prior connector. Production DB was fresh. The agent never verified that the specific conditions present in production matched staging.
**Lesson:** A feature is not "working" until it is verified in the target environment. Staging confirmation is a necessary but not sufficient condition for production confidence.

### Failure 2: Silent failure misread as success
**What happened:** `runMigrations()` from `stripe-replit-sync` logged no error and returned cleanly. "Stripe schema ready" was logged. But no tables were created.
**Root cause:** Inside the package, `connectAndMigrate()` checked `fs.existsSync(migrationsDirectory)`. The directory didn't exist (esbuild bundled the JS but not the SQL files). The function silently returned without throwing. The outer `try/catch` saw no exception, so success was assumed.
**Lesson:** A function returning without error does not mean it did what you expected. When a critical setup step completes "successfully" but downstream state is wrong, the setup function itself must be interrogated — not trusted.
**Pattern to watch:** `if (!condition) { log("skipping"); return; }` inside a library is a silent no-op. Always verify postconditions, not just absence of exceptions.

### Failure 3: esbuild bundling of file-path-dependent packages
**What happened:** `stripe-replit-sync` uses `path.resolve(__dirname, "./migrations")` to find its SQL migration files. When bundled by esbuild, `__dirname` is rewritten to point to the esbuild output directory (`dist/`), not the package's own directory. The `migrations/` folder didn't exist there.
**Root cause:** esbuild inlines CJS packages and rewrites `__dirname`. Any package that uses `__dirname` to locate sibling non-JS assets (SQL, JSON, proto, etc.) must be externalized.
**Lesson:** Before bundling any package, check whether it reads files from disk at runtime using `__dirname`, `path.resolve`, or `fileURLToPath`. If yes, add it to the `external` list.
**Detection method:** `grep -r "existsSync\|readFileSync\|__dirname.*resolve\|fileURLToPath" node_modules/<pkg>/dist/` — if hits appear alongside non-JS asset paths, externalize it.

### Failure 4: Race condition between server startup and user interaction
**What happened:** The Stripe backfill took ~37 seconds. If a user reached the pricing page and clicked Buy within those 37 seconds, `stripe.products` was empty. The endpoint returned `{ products: [] }` with HTTP 200. The frontend found no matching product and threw "Product not found in Stripe."
**Root cause:** The products endpoint had no fallback for an empty database. It treated an empty result the same as a populated one — both returned 200.
**Lesson:** An empty-but-valid DB response is not always semantically valid. When a 200 with empty data is indistinguishable from a 200 with real data at the HTTP layer, the frontend will silently fail. Design endpoints to either (a) block until data is available, (b) return a 503 with retry guidance, or (c) fall back to an authoritative source.

---

## Part 2 — Methodology: Before Declaring Anything "Working"

Run this checklist mentally before telling a user a fix is complete.

### The Five-Gate Check

**Gate 1 — Is the fix verified in the correct environment?**
- Did I test in staging or production? Which one does the user care about?
- Are the databases, secrets, and external services in that environment equivalent to what I tested?
- If production is a fresh deploy, did I account for cold-start state (empty DB, no cache, no prior syncs)?

**Gate 2 — Did I verify postconditions, not just absence of errors?**
- What should concretely exist/change after this fix runs? (Tables created? Data populated? Endpoint returns non-empty?)
- Did I verify that concrete outcome — not just that no exception was thrown?
- If a library function ran "successfully," did I check what it actually produced?

**Gate 3 — Are there silent failure paths?**
- Does any critical setup function contain `if (!condition) { return; }` branches that could silently no-op?
- Does any async operation fire-and-forget (`.then(...).catch(...)`) without the main path waiting for it?
- Does any 200 response have a semantically empty body that the frontend might mishandle?

**Gate 4 — Are there timing or ordering dependencies?**
- Does any feature depend on a background job, backfill, or async init that might not complete before the user arrives?
- Is there a race condition between server startup and first user request?
- Did I add a fallback for the window before async initialization completes?

**Gate 5 — Does the bundle/build include everything it needs at runtime?**
- Does any dependency read non-JS files (SQL, JSON, proto, templates) from a relative path?
- If yes, is it in the `external` list so it loads from `node_modules` at runtime?
- Did I verify the actual build output — not just that `tsc` or `esbuild` exited 0?

---

## Part 3 — Self-Test Protocol

After completing any significant fix, run this self-test before responding to the user.

### Step 1: Name the postcondition
Write one sentence: "After this fix, [X] should be true." Be concrete.
- Bad: "Stripe should work."
- Good: "The `/api/stripe/products` endpoint should return 7 products with `metadata.plan` set."

### Step 2: Verify it directly
Use `curl`, `grep`, log inspection, or a DB query — not inference. If you can't verify it directly, say so explicitly and tell the user what to check.

### Step 3: Check the deployment logs (for production issues)
Always run `fetch_deployment_logs` before and after a production fix. Never rely on staging behavior to predict production behavior for first-deploy scenarios.

### Step 4: Stress-test the timing
Ask: "What happens if a user arrives at this feature in the first 5 seconds of server startup?" If the answer is "it breaks," add a fallback.

### Step 5: Check for silent no-ops in critical paths
For any library function called in a critical path (DB migration, auth init, schema creation), grep its source for early-return guards and verify the postcondition exists in the database or filesystem — not just that the function returned.

---

## Part 4 — Known Failure Patterns (Reference)

| Pattern | Symptom | Detection |
|---|---|---|
| esbuild bundling a file-path-dependent package | Library silently skips setup; no error thrown | `grep "__dirname\|existsSync\|readFileSync" node_modules/<pkg>/dist/` |
| Silent early return in library init | Setup "succeeds" but state not created | Read library source; check postconditions directly |
| Race condition: backfill vs first request | Intermittent empty response on fresh deploy | Add fallback to authoritative API source |
| Staging DB pre-populated, production DB fresh | Works in staging, fails in production | Always test cold-start path; check production logs |
| 200 with empty body treated as success | Frontend silent failure with misleading error | Distinguish "empty but valid" from "empty because not ready" |
| Production/staging environment mismatch | Fix confirmed in wrong environment | Always identify which environment the user is reporting from |

---

## Part 5 — Communication Rules Derived From This Session

1. **Never say "it should work now" after a staging-only test for a production issue.** Say "staging is confirmed working — republish and then I'll verify production logs."
2. **When production logs show a silent success followed by a downstream failure, the "success" is suspect.** Read the library source before concluding the fix was correct.
3. **When a user reports an error immediately after a deploy, timing is the first hypothesis.** Check whether the error could be a cold-start race condition before assuming a code bug.
4. **Proactively fetch deployment logs after every publish.** Don't wait for the user to report an error — check the logs and catch failures before the user encounters them.
5. **Distinguish error types clearly for the user.** "Could not load products" (500 = server error) vs "Product not found" (200 + empty = data not ready) are entirely different problems with different fixes.

---

## How To Use This Skill

Load this skill at the start of any debugging session involving:
- Production deployments that differ from staging
- Third-party library initialization failures
- esbuild / bundler configuration
- Stripe or any payment/sync infrastructure
- Any scenario where "it works in dev but not prod"

Run the Five-Gate Check before closing any task. Run the Self-Test Protocol before telling the user a fix is complete.

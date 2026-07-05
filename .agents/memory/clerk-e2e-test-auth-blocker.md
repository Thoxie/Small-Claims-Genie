---
name: Clerk e2e test-auth blocker
description: When runTest's testClerkAuth sign-in fails, how to diagnose vs. give up and fall back to manual verification
---

The `runTest`/testing-subagent `testClerkAuth: true` flag is supposed to let the Playwright test agent sign in programmatically without touching Clerk's UI. In some sessions this bridge itself fails or is blocked, independent of any app code:

- Forgetting `testClerkAuth: true` produces a generic "Couldn't find your account" error from the Clerk UI — that's a caller mistake, retry with the flag set.
- Even with the flag set correctly, the underlying `signInClerkUser` helper can return "Unprocessable Entity", or the test agent can report the Clerk sign-in page only offers OAuth (Google/Facebook) buttons with no usable email/password path for automation — this is an environment/test-infra limitation, not an app bug.

**Why:** Wasting repeated attempts against the same infra blocker burns time without new information, and the failure gives no signal about the actual feature under test.

**How to apply:** If two distinct attempts (one confirming the flag is set) still fail with a Clerk-auth/OAuth blocker, stop retrying `runTest`. Fall back to static/manual verification: read the changed components end-to-end, confirm prop interfaces match call sites, run typecheck/lint, and re-run any narrower non-UI regression scripts (e.g. curl-based API tests) that don't require a browser session. Report the e2e limitation transparently as a skip_validation_reason rather than silently declaring full test coverage.

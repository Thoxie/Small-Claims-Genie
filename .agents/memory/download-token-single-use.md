---
name: Download tokens are single-use
description: Form-download tokens are consumed on first use; multi-fetch clients/tests must mint a fresh token per request.
---

# Download tokens are single-use

Form-download tokens (the `?token=` query param on the case form-download
routes) are consumed on their first successful use. A second request presenting
the same token returns **HTTP 403**, not 200.

**Why:** Any test or client that fetches more than one PDF for the same case
(e.g. a signed-vs-unsigned pixel-diff regression check) will see the first fetch
succeed and every later fetch 403 if it reuses one token. This is easy to
misdiagnose as an auth/ownership bug because the first (signed) fetch works.

**How to apply:** Mint a fresh token for every PDF request rather than reusing
one across signed + unsigned fetches.

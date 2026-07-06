---
name: SSE marker parsing order dependency
description: When streaming assistant text contains multiple trailer markers (e.g. FEATURE_TAG, SUGGESTIONS, SIGNUP_CTA), truncating on an earlier marker before parsing a later-positioned-in-source marker can consume the delimiter it needs.
---

When a streamed chat response embeds several sequential machine-readable markers in one text block (each on its own line, in a fixed order), client-side parsing that strips markers one at a time — outer-to-inner by truncation — can accidentally consume the newline/delimiter a still-unparsed marker depends on to know its value is "complete."

**Why:** In the Help Genie widget, the parser first truncated the string at the SUGGESTIONS marker, then tried to parse the newline-terminated FEATURE_TAG line that appeared before SUGGESTIONS in the source. Truncating at SUGGESTIONS removed the trailing newline after the tag value, so the tag parser's "wait for newline" check never succeeded — the CTA sentence silently never rendered. This only showed up in the real streaming UI (Playwright e2e), not in direct curl checks against the raw SSE payload, because curl testing looked at the raw text, not the post-parse rendered output.

**How to apply:** When adding a new positional marker to a multi-marker streamed format, either (a) parse markers in the same order they appear in the source before truncating anything, or (b) when truncating on a later marker first, treat "the later marker was already found" as proof any earlier marker's value is complete, even without its own trailing delimiter. Verify with an actual rendered-UI e2e test, not just a raw API/curl check — parsing bugs like this one hide in the gap between "correct raw stream" and "correct rendered output."

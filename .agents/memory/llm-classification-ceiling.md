---
name: LLM classification ceiling for AI-tag output
description: When a model's own generated answer content strongly resembles a wrong category, prompt-only self-check instructions can plateau at a hard failure rate that no amount of prompt tuning fixes.
---

Some classification/tagging tasks embedded in an LLM's free-text generation (e.g. an internal `FEATURE_TAG:` marker chosen based on the content of the answer the model itself just wrote) can have a deterministic failure mode: if the generated answer's wording overlaps heavily with a different category's trigger words, the model's self-check step reliably picks the wrong tag — even with an in-context worked example matching the exact scenario, explicit SELF-CHECK re-reading instructions, and multiple prompt rewordings.

**Why:** The tag is chosen conditioned on the model's own prior output tokens, not on the original user input directly. If the generated answer text pattern-matches a different feature's keywords, the self-check step is fighting the model's own momentum rather than reasoning from first principles. This can be empirically consistent (e.g. 100% failure across 6 samples) rather than temperature noise — worth measuring with repeated samples before concluding it's a prompt problem at all.

**How to apply:** If repeated, targeted prompt tuning (adding examples, rewording self-check instructions) does not move the measured failure rate after 2-3 genuinely different attempts, stop tuning the prompt and add a deterministic code-level guardrail instead: classify the *original user input* (not the model's generated answer) with simple keyword/signal matching, and force-correct the tag server-side when the guardrail's classification disagrees with the model's. Verify the guardrail doesn't change user-visible output if the tag is parsed out before rendering (e.g. via a buffered SSE rewrite around just the tag line).

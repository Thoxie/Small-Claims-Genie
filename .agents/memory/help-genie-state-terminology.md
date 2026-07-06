---
name: State-specific terminology in shared AI prompts
description: How to add a state-specific word swap (e.g. NC "magistrate" vs "judge") to a shared prompt without diluting the default term for other states.
---

When a prompt needs to use a different word for one state but the same word for all others, keep the common word as the literal default everywhere in the prompt, and add the exception as a parenthetical, e.g. "the judge (in North Carolina, the magistrate)". 

**Why:** Introducing a third, neutral/abstracted term to "unify" the two options (e.g. calling the hearing official a "presiding official" instead of picking a default) makes the model adopt that neutral term literally for every state — including the ones that should say "judge". The model does not reliably resolve a neutral placeholder back into the concrete per-state term.

**How to apply:** For any per-state prompt customization, edit in place with the majority-case word left untouched, then attach `(in <exception state>, use <exception word> instead)`. Verify with a regression test that checks the literal word appears for both the exception state and at least one majority-case state — don't just check for absence of errors.

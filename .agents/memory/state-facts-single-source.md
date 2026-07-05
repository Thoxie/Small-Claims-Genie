---
name: State facts single source of truth
description: How canonical per-state legal facts (claim limits, SOL, fees, service of process, forms) are consolidated and how to safely verify refactors of AI prompt text against them.
---

`lib/state-facts` (composite lib, exports `StateFacts`/`STATE_FACTS` keyed by state code plus helpers like `getStateFacts`, `formatSolLine`, `formatFilingFeeTiersParen/Pipe`) is the canonical source for per-state legal facts. It is consumed by both the AI system prompts (`artifacts/api-server/src/prompts/chat-prompt.ts`, `help-chat-prompt.ts`) and the UI (`artifacts/small-claims-genie/src/lib/state-resources.ts`).

**Why:** these facts were previously duplicated across three files with independent copies that could silently drift out of sync (a fact fixed in one place but not another). A single source lets future state additions (e.g. VA) and fact corrections happen in one place.

**How to apply:**
- When refactoring prose/prompt text to interpolate from `STATE_FACTS`, only substitute a field when its rendered value is byte-identical to the original literal text. Pre-existing wording divergences between files (e.g. IL filing fee tiers differ between prompt copy and the canonical value) are not bugs to silently "fix" — flag them, don't normalize them, per the project's no-silent-behavior-change preference.
- To verify a prompt refactor didn't change rendered output, diff the actual rendered string before/after. `tsx`/`npx tsx` may not resolve in this sandbox — use `node --experimental-strip-types -e "import(...)"` to execute/import TS modules directly for this kind of verification.
- Watch for boolean-flag inversions in shared formatting helpers (e.g. a `lowercaseFirst` option) — passing the wrong value silently changes capitalization/wording in a way that's easy to miss without a byte-exact diff.
- Adding a new state is not just `STATE_FACTS` + UI pickers + prompts: `lib/api-spec/openapi.yaml` has multiple hardcoded `jurisdictionState`/`state` enum lists (counties, cases). Missing one breaks the generated Zod/React-Query types and fails frontend typecheck with a cryptic `Type '"XX"' is not assignable to type ...Enum`. Grep the whole openapi.yaml for the existing state enum and update every occurrence, then rerun `pnpm --filter @workspace/api-spec run codegen` before typechecking.

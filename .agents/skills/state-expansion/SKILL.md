---
name: state-expansion
description: Methodology for adding a new state (county court directory + state legal facts) to Small Claims Genie. Use whenever the user asks to add a new state, research a state's small claims rules, or build county data for a state.
---

# State Expansion Methodology

Small Claims Genie supports one state at a time by layering three things: county court directory data, canonical state legal facts, and (eventually) a PDF form-generation pipeline. This skill defines the repeatable process so each new state follows the same rigor as CA/FL/TX/IL/NC/VA.

## Phase 0 — Research (before touching any code)

Research is done via a human pasting ChatGPT (web, browsing-enabled) output into the chat — the agent does not have live browsing. Two deliverables, gathered in **small batches**, never one giant prompt:

1. **State legal facts questionnaire** (one state per message) — court system name, self-help URL, claim limit (individual vs. business/assignee — these often differ), attorneys-allowed + corporate representation requirement (attorneys optional for individuals ≠ attorneys required for LLCs/corporations), filing fees, statute of limitations by claim type, service of process (days before hearing, methods, who arranges it), required forms (plaintiff-side only — see Guardrails), judgment validity + renewability, collection tools, appeal process (deadline/type/where), filing frequency caps, key/major counties, e-filing mandate.
2. **County court directory CSV** — `id,name,state,courthouseName,courthouseAddress,courthouseCity,courthouseZip,phone,clerkWebsite,notes` — batched ~10-15 counties per message so the model actually browses instead of answering from memory/training data.

Always instruct the model: *"You must actually search the web — do not answer from memory. If you cannot find a fact, mark it UNKNOWN or NEEDS VERIFICATION rather than guessing, and cite the URL you pulled each fact from."*

### Known structural quirks to ask about explicitly
- **Multi-county judicial districts** (e.g. NJ Special Civil Part vicinages combine several counties under one courthouse) — ask the model to map each county to its correct district rather than assuming 1:1.
- **Multi-facility counties** (e.g. WA King County has multiple separate district court filing facilities) — one row per facility, not per county.
- **Court organized by district vs. county** — some states file by judicial district, not administrative county.

## Phase 1 — Data layer (safe to build immediately, no user-facing exposure)

1. `artifacts/api-server/src/data/counties-XX.ts` — array of county records matching the exact field shape used by `counties-va.ts`. **Never fabricate.** If address/phone/etc. is unverified or unknown, leave the field as an empty string and put the caveat in `notes`. Preserve "NEEDS VERIFICATION" and "UNKNOWN" language from research verbatim in `notes` — don't silently resolve it.
2. Register the new county array in `artifacts/api-server/src/routes/counties.ts` (import + the `if (state === "XX")` branch + the "all states" spread).
3. `lib/state-facts/src/index.ts` — add the state code to `StateCode`, `STATE_ORDER`, and a new `STATE_FACTS[XX]` entry. This is the single source of truth consumed by both the AI prompts and the Resources page (`state-resources.ts`) — never hand-duplicate facts elsewhere.
   - Every field in `StateFacts` is currently required (no optional numbers). If a genuinely required numeric fact (e.g. `judgmentValidityYears`) could not be verified by research, do not silently guess — flag it explicitly to the user before filling it, and mark the fallback value's provenance in a comment so it's easy to find and correct later.

Completing Phase 1 means the state's data exists in the codebase but is **not yet reachable by real users** — nothing here changes the state picker, AI prompts, or Court Forms tab.

## Phase 2 — User-facing exposure (separate decision point — always confirm with the user first)

Do NOT add a new state to the state picker dropdowns (`cases/new.tsx`, `intake-step-1.tsx`) or wire it into the AI system prompts (`chat.ts`, `help-chat.ts` per replit.md rule #4) until:
- All "NEEDS VERIFICATION" / "UNKNOWN" facts blocking core flows (claim limit, filing fee, service deadline, judgment validity) are resolved.
- A decision has been made on the actual PDF form-generation approach for that state's required forms (AcroForm / XFA / PNG overlay — see the Unified Form Engine section of replit.md and the `fl-forms-architecture` memory topic for the multi-step pattern of wiring a new jurisdiction's forms).

Exposing a state in the picker before its forms pipeline exists lets a user create a case they can never actually finish — always flag this tradeoff and get explicit sign-off before doing Phase 2, per replit.md rule #9 (never change existing user-facing behavior without flagging first).

## Rollout checklist (once Phase 2 is greenlit)

1. State picker dropdowns: `cases/new.tsx`, `intake-step-1.tsx` (there are two separate hardcoded lists — update both, see `duplicate-hardcoded-state-dropdowns` memory).
2. `state-resources.ts` (Resources page) — add the new `ResourceStateCode` entries across every `Record<ResourceStateCode, ...>` map in the file.
3. `pricing.tsx` (`SUPPORTED_STATES`) — add the new state so the "Available in" badge and pricing copy stay accurate.
4. `counties.tsx` (public `/counties` directory page) — add the new state to `STATE_TABS` and confirm `FilingFeesPanel` renders correctly for its data shape (numeric 3-tier grid, flat fee, or notes-only fallback depending on what the state's county data actually has). This is a standing requirement for every new state, not optional polish — always do it as part of Phase 2/rollout.
5. Court Forms tab (`forms-tab.tsx`) and Deadline Calculator tab (`deadline-calculator-tab.tsx`) — add state-specific sections following the existing per-state conditional pattern (`isVirginiaCase`, `isNorthCarolinaCase`, etc.).
6. AI prompts (`chat.ts` Case Advisor, `help-chat.ts` Help Genie) — add a new per-state block interpolating from `STATE_FACTS`, matching the existing CA/FL/TX/IL/NC/VA blocks.
7. Actual PDF form generation — register new `FormDefinition`s in the Form Registry per the Unified Form Engine pattern in replit.md.
8. Run `pnpm run typecheck` from the workspace root (never a leaf artifact in isolation).
9. Test the full flow end-to-end (new case creation → county selection → intake → forms → AI chat mentions the state correctly), including clicking through the new state's tab on `/counties` via `runTest()`.

## Guardrails (apply throughout)

- **Plaintiff-only system.** Never research, build, or surface defendant-side forms/workflows (see `plaintiff-only` memory topic).
- **Never fabricate legal facts.** An empty field + honest note beats a plausible-sounding guess, especially for a legal product.
- **AI prompt sync is non-negotiable** once a state goes live (replit.md rule #4) — stale prompts give users wrong legal guidance.

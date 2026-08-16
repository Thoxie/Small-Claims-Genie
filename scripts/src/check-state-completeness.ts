/**
 * check-state-completeness.ts
 *
 * Automated completeness check for every state in the canonical state
 * registry (`@workspace/state-facts`). Verifies that each state that is
 * exposed to users is wired into every place a new state must be wired into,
 * per the rollout checklist in `.agents/skills/state-expansion/SKILL.md`.
 *
 * This does NOT re-check things TypeScript already guarantees (e.g.
 * `Record<StateCode, ...>` maps in state-resources.ts, or SUPPORTED_STATES /
 * STATE_TABS that are derived directly from STATE_ORDER) — those can never
 * silently drift because a missing key is a compile error. It checks the
 * things that are easy to forget precisely because they compile fine even
 * when incomplete: free-form per-state conditionals in tabs, per-state prose
 * blocks in AI prompts, and per-state PDF form registrations.
 *
 * It also cross-checks AI prompt claims ("not yet available") against the
 * actual Form Registry, since a stale prompt is a live user-guidance bug
 * (see replit.md rule #4) that no compiler will catch.
 *
 * Usage: pnpm --filter @workspace/scripts run check:state-completeness
 * Exits non-zero if any check fails, so it can be wired into CI later.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const STATE_ORDER = ["CA", "FL", "IL", "NJ", "NC", "TX", "VA", "WA", "AZ"] as const;
type StateCode = (typeof STATE_ORDER)[number];

const STATE_NAMES: Record<StateCode, string> = {
  CA: "California",
  FL: "Florida",
  TX: "Texas",
  IL: "Illinois",
  NC: "North Carolina",
  VA: "Virginia",
  NJ: "New Jersey",
  WA: "Washington",
  AZ: "Arizona",
};

// CA is the original/default state and is intentionally handled as the
// fallback branch (no isCaliforniaCase conditional) in per-state UI files —
// see replit.md / forms-tab.tsx structure. All other states must have an
// explicit conditional.
const STATES_REQUIRING_EXPLICIT_WIRING = STATE_ORDER.filter((s) => s !== "CA");

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

function tryRead(relPath: string): string | null {
  try {
    return read(relPath);
  } catch {
    return null;
  }
}

interface Finding {
  level: "FAIL" | "WARN";
  area: string;
  state: StateCode;
  message: string;
}

const findings: Finding[] = [];
function fail(area: string, state: StateCode, message: string) {
  findings.push({ level: "FAIL", area, state, message });
}
function warn(area: string, state: StateCode, message: string) {
  findings.push({ level: "WARN", area, state, message });
}

// ─── 1. Court Forms tab wiring ──────────────────────────────────────────────
// Every non-CA state must have an isXCase conditional in forms-tab.tsx AND a
// corresponding forms-tab-sections/<slug>-forms-section.tsx file it renders.

const FORMS_TAB_PATH =
  "artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab.tsx";
const formsTabSrc = read(FORMS_TAB_PATH);
const SECTIONS_DIR =
  "artifacts/small-claims-genie/src/pages/cases/tabs/forms-tab-sections";
const sectionFiles = new Set(readdirSync(path.join(ROOT, SECTIONS_DIR)));

const STATE_SLUG: Record<StateCode, string> = {
  CA: "california",
  FL: "florida",
  TX: "texas",
  IL: "illinois",
  NC: "north-carolina",
  VA: "virginia",
  NJ: "new-jersey",
  WA: "washington",
  AZ: "arizona",
};

for (const state of STATES_REQUIRING_EXPLICIT_WIRING) {
  const conditionalRe = new RegExp(
    `jurisdictionState\\s*(?:as string)?\\s*\\)?\\s*===\\s*["']${state}["']`,
  );
  if (!conditionalRe.test(formsTabSrc)) {
    fail(
      "forms-tab.tsx",
      state,
      `No jurisdictionState === "${state}" conditional found in ${FORMS_TAB_PATH}`,
    );
    continue;
  }
  const sectionFile = `${STATE_SLUG[state]}-forms-section.tsx`;
  if (!sectionFiles.has(sectionFile)) {
    fail(
      "forms-tab-sections",
      state,
      `Expected ${SECTIONS_DIR}/${sectionFile} to exist but it does not`,
    );
    continue;
  }
  const sectionComponentRe = new RegExp(
    `<[A-Za-z]+FormsSection\\s+ctx=\\{ctx\\}\\s*/>`,
  );
  // Confirm forms-tab.tsx actually renders *some* FormsSection for this
  // state's conditional block (loose check: the state's slug-derived
  // PascalCase component name appears near a matching conditional).
  const pascal = STATE_SLUG[state]
    .split("-")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
  if (!formsTabSrc.includes(`${pascal}FormsSection`)) {
    fail(
      "forms-tab.tsx",
      state,
      `${pascal}FormsSection is never referenced in ${FORMS_TAB_PATH}`,
    );
  } else if (!sectionComponentRe.test(formsTabSrc)) {
    warn(
      "forms-tab.tsx",
      state,
      `A FormsSection component is referenced but the ctx={ctx} render pattern wasn't found — verify manually`,
    );
  }
}

// ─── 2. Deadline Calculator tab wiring ─────────────────────────────────────
// Every non-CA state should have its own jurisdictionState === "XX" branch.
// (This check currently surfaces real gaps — see README output.)

const DEADLINE_TAB_PATH =
  "artifacts/small-claims-genie/src/pages/cases/tabs/deadline-calculator-tab.tsx";
const deadlineTabSrc = read(DEADLINE_TAB_PATH);
for (const state of STATES_REQUIRING_EXPLICIT_WIRING) {
  const re = new RegExp(
    `jurisdictionState\\s*(?:as string)?\\s*\\)?\\s*===\\s*["']${state}["']`,
  );
  if (!re.test(deadlineTabSrc)) {
    fail(
      "deadline-calculator-tab.tsx",
      state,
      `No jurisdictionState === "${state}" branch found — this state falls back to the default (CA) deadline logic`,
    );
  }
}

// ─── 3. AI prompt sync (replit.md rule #4) ─────────────────────────────────
// Every non-CA state must have a per-state prose block in both prompts that
// interpolates from STATE_FACTS (the `${XX.` pattern used throughout both
// files), so numbers can never drift from the canonical registry.

const CHAT_PROMPT_PATH = "artifacts/api-server/src/prompts/chat-prompt.ts";
const HELP_CHAT_PROMPT_PATH =
  "artifacts/api-server/src/prompts/help-chat-prompt.ts";
const chatPromptSrc = read(CHAT_PROMPT_PATH);
const helpChatPromptSrc = read(HELP_CHAT_PROMPT_PATH);

for (const state of STATES_REQUIRING_EXPLICIT_WIRING) {
  const interpRe = new RegExp(`\\$\\{${state}\\.`);
  if (!interpRe.test(chatPromptSrc)) {
    fail(
      "chat-prompt.ts",
      state,
      `No \${${state}.<field>} interpolation found — Case Advisor prompt has no dedicated ${STATE_NAMES[state]} block`,
    );
  }
  if (!interpRe.test(helpChatPromptSrc)) {
    fail(
      "help-chat-prompt.ts",
      state,
      `No \${${state}.<field>} interpolation found — Help Genie prompt has no dedicated ${STATE_NAMES[state]} block`,
    );
  }
}

// ─── 4. Form Registry coverage ─────────────────────────────────────────────
// Every non-CA state should have at least one FormDefinition registered with
// state: "XX" in forms/definitions/*.ts.

const DEFINITIONS_DIR = "artifacts/api-server/src/forms/definitions";
const definitionFiles = readdirSync(path.join(ROOT, DEFINITIONS_DIR)).filter(
  (f) => f.endsWith("-definition.ts"),
);
const definitionsSrc = definitionFiles
  .map((f) => `// --- ${f} ---\n` + read(path.join(DEFINITIONS_DIR, f)))
  .join("\n");

const statesWithRegisteredForms = new Set<StateCode>();
for (const state of STATE_ORDER) {
  const re = new RegExp(`state:\\s*["']${state}["']`);
  if (re.test(definitionsSrc)) {
    statesWithRegisteredForms.add(state);
  }
}
for (const state of STATES_REQUIRING_EXPLICIT_WIRING) {
  if (!statesWithRegisteredForms.has(state)) {
    fail(
      "forms/definitions",
      state,
      `No FormDefinition with state: "${state}" found in ${DEFINITIONS_DIR} — this state has no pre-fillable PDF form`,
    );
  }
}

// ─── 5. Stale "not yet available" claims vs. actual Form Registry ─────────
// If a prompt tells users a state's forms "are not yet available" / "coming
// soon" but that state DOES have a registered FormDefinition, the prompt is
// stale and giving users wrong guidance (replit.md rule #4 violation).

// Prompt lines are long, comprehensive sentences that mention every state at
// least once (e.g. a single sentence summarizing all 8 states' forms). So a
// same-line match is too coarse — instead look at a tight character window
// immediately AROUND each "not yet available"/"coming soon" phrase and only
// flag states mentioned in that local window (this is how a human reader
// would parse "NJ/WA: pre-filled forms not yet available" as applying to NJ
// and WA specifically, not to every state in the surrounding paragraph).
const UNAVAILABLE_RE = /not yet available|coming soon/gi;
const WINDOW_CHARS = 60;

function checkStaleUnavailabilityClaims(promptPath: string, src: string) {
  let match: RegExpExecArray | null;
  UNAVAILABLE_RE.lastIndex = 0;
  while ((match = UNAVAILABLE_RE.exec(src)) !== null) {
    const start = Math.max(0, match.index - WINDOW_CHARS);
    const window = src.slice(start, match.index);
    const lineNumber = src.slice(0, match.index).split("\n").length;
    for (const state of STATE_ORDER) {
      const mentionsState =
        window.includes(`"${state}"`) ||
        window.includes(`${state}:`) ||
        window.includes(`${state}/`) ||
        window.includes(`/${state}`) ||
        new RegExp(`\\b${state}\\b`).test(window);
      if (mentionsState && statesWithRegisteredForms.has(state)) {
        fail(
          "prompt-vs-registry",
          state,
          `${promptPath}:${lineNumber} claims ${state} forms are "not yet available"/"coming soon" (found near "...${window.trim().slice(-50)}${match[0]}"), but ${DEFINITIONS_DIR} has a registered FormDefinition for state: "${state}". Update the prompt.`,
        );
      }
    }
  }
}

checkStaleUnavailabilityClaims(CHAT_PROMPT_PATH, chatPromptSrc);
checkStaleUnavailabilityClaims(HELP_CHAT_PROMPT_PATH, helpChatPromptSrc);

// ─── 6. No duplicate hardcoded state lists outside the canonical registry ──
// Spot-check a couple of known past offenders so a future regression doesn't
// silently reintroduce a second source of truth (see
// duplicate-hardcoded-state-dropdowns memory topic).

const filesExpectedToDeriveFromRegistry = [
  "artifacts/small-claims-genie/src/pages/cases/new.tsx",
  "artifacts/small-claims-genie/src/pages/pricing.tsx",
  "artifacts/small-claims-genie/src/pages/counties.tsx",
];
for (const relPath of filesExpectedToDeriveFromRegistry) {
  const src = tryRead(relPath);
  if (src === null) continue;
  if (!src.includes("STATE_ORDER") && !src.includes("STATE_FACTS")) {
    warn(
      "single-source-of-truth",
      "CA",
      `${relPath} does not reference STATE_ORDER/STATE_FACTS from @workspace/state-facts — verify it isn't hand-maintaining its own state list`,
    );
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────

const fails = findings.filter((f) => f.level === "FAIL");
const warns = findings.filter((f) => f.level === "WARN");

console.log(
  `\nState completeness check — ${STATE_ORDER.length} states (${STATE_ORDER.join(", ")})\n`,
);

if (findings.length === 0) {
  console.log("✅ All states fully wired across every checked surface.\n");
} else {
  for (const f of [...fails, ...warns]) {
    const icon = f.level === "FAIL" ? "❌" : "⚠️ ";
    console.log(`${icon} [${f.level}] (${f.area}, ${f.state}) ${f.message}`);
  }
  console.log(
    `\n${fails.length} failure(s), ${warns.length} warning(s) out of ${findings.length} finding(s).\n`,
  );
}

if (fails.length > 0) {
  process.exitCode = 1;
}

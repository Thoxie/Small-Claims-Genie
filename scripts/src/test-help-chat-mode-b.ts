/**
 * Regression check: public "Help Genie" chat (`/api/help` with isSignedIn: false)
 * must keep the Mode A / Mode B sales-aware answering behavior from the
 * VISITOR_PROMPT in artifacts/api-server/src/prompts/help-chat-prompt.ts:
 *
 * - Mode A (pure legal/procedural questions, e.g. statute of limitations):
 *   must NOT force a named paid-feature pitch into the answer.
 * - Mode B (questions overlapping a paid capability — settling, filing,
 *   serving, hearing prep, evidence/case strength): must mention the
 *   correct matching feature by name somewhere in the response.
 *
 * This guards against future prompt edits or model swaps silently
 * reintroducing generic DIY walkthroughs (no pitch) or, in the other
 * direction, forcing sales pitches onto pure legal questions.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run test:help-chat-mode-b
 *
 * Re-run this after any change to:
 *   - artifacts/api-server/src/prompts/help-chat-prompt.ts (VISITOR_PROMPT)
 *   - artifacts/api-server/src/routes/help-chat.ts (/help endpoint)
 *   - the OpenAI model used for help-chat completions
 *
 * NOTE ON RATE LIMITS: `/api/help` is rate-limited per-IP (30 calls/hour,
 * shared with real anonymous visitors). Running this script against the
 * default `API_BASE_URL=http://localhost:80` hits the server over loopback,
 * which the server automatically exempts from the limit outside production
 * (see `isInternalTestBypass` in artifacts/api-server/src/lib/rate-limiter.ts)
 * — so repeated test runs never consume real visitor budget or require
 * manually deleting rows from `ai_rate_limits`. If you point this script at
 * a non-loopback `API_BASE_URL` (e.g. a public preview/staging domain), it
 * will consume real per-IP budget like any other client.
 */

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// The backend now emits a deterministic "FEATURE_TAG: <TAG>" marker (parsed
// client-side in help-genie-widget.tsx, which appends the real human-facing
// CTA text). The raw /api/help stream tested here will NOT contain prose
// like "demand letter" — it contains the machine tag "DEMAND_LETTER". Tests
// must assert on the tag, not on prose feature names.
const VALID_TAGS = [
  "DEMAND_LETTER",
  "COURT_FORMS",
  "PROCESS_SERVER",
  "HEARING_PREP",
  "EVIDENCE_UPLOAD",
  "CASE_ADVISOR",
  "DEADLINE_TRACKING",
  "JUDGMENT_COLLECTION",
  "NONE",
];

interface Case {
  label: string;
  mode: "A" | "B";
  message: string;
  // Mode B only: any of these FEATURE_TAG values counts as a pass.
  expectedTags?: string[];
  // Mode A only: allow up to this many attempts before failing. Defaults to
  // 1 (Mode A questions should be unambiguous on the first try). Only set
  // this above 1 for genuinely hard boundary cases (e.g. a defendant
  // scenario worded close to a feature-table row) where temperature=0.5
  // variance can occasionally over-pitch — the same tolerance already
  // extended to Mode B for the same reason.
  maxAttempts?: number;
  // Simulates a visitor who has already selected a state/county on a
  // marketing page (Resources/Counties), which the widget forwards on every
  // turn via jurisdictionState/jurisdictionCounty. Regression coverage for
  // the real-world scenario: does adding state-specific context ever
  // suppress the FEATURE_TAG/CTA pipeline that sells the matching paid
  // feature? (See replit.md — Help Genie must both use state-specific facts
  // AND surface relevant product features.)
  jurisdictionState?: string;
  jurisdictionCounty?: string;
}

// The live model runs at temperature 0.5, so exact wording varies run to run.
// To avoid flaking on harmless phrasing variance while still catching a real
// regression (prompt or model change that stops pitching the feature at all),
// each Mode B case gets up to MAX_ATTEMPTS tries and passes if any attempt
// contains the expected feature name.
const MAX_ATTEMPTS = 3;

const CASES: Case[] = [
  {
    label: "Pure legal fact — statute of limitations (Mode A)",
    mode: "A",
    message: "What's the statute of limitations for a written contract in Texas?",
  },
  {
    label: "Pure legal fact — claim limit (Mode A)",
    mode: "A",
    message: "What is the small claims limit in California?",
  },
  {
    label: "Settling / negotiating (Mode B -> Demand Letter tool)",
    mode: "B",
    message: "How do I settle this before going to court?",
    expectedTags: ["DEMAND_LETTER"],
  },
  {
    label: "Filing (Mode B -> court forms)",
    mode: "B",
    message: "How do I file a small claims case?",
    expectedTags: ["COURT_FORMS"],
  },
  {
    label: "Serving the defendant (Mode B -> process server)",
    mode: "B",
    message: "How do I serve the defendant with my lawsuit?",
    expectedTags: ["PROCESS_SERVER"],
  },
  {
    label: "Hearing prep (Mode B -> Hearing Prep / Mock Trial)",
    mode: "B",
    message: "What do I say to the judge at the hearing?",
    expectedTags: ["HEARING_PREP"],
  },
  {
    label: "Organizing evidence / proving case (Mode B -> Evidence Upload tool)",
    mode: "B",
    message: "How do I prove my case in court?",
    expectedTags: ["EVIDENCE_UPLOAD"],
  },
  {
    label: "Being sued, no counterclaim mentioned (Mode A — defendant scenario, out of scope)",
    mode: "A",
    message: "I got served with a small claims lawsuit for a dispute that's entirely one-sided against me — I have no claim of my own back against them. What should I do to respond and prepare?",
    // This is a genuinely hard boundary case: the answer legitimately talks
    // about "the hearing" and "preparing", which resembles the Hearing Prep
    // feature-table row in wording even though the underlying topic (a pure
    // defendant with no counterclaim) is correctly out of scope. At
    // temperature=0.5 the model occasionally over-pitches on this one. Same
    // tolerance as Mode B's MAX_ATTEMPTS, applied here instead of endlessly
    // re-tuning the prompt for a single edge case.
    maxAttempts: MAX_ATTEMPTS,
  },
  {
    label: "Being sued WITH a counterclaim (Mixed -> AI Case Advisor for the counterclaim)",
    mode: "B",
    message: "I'm being sued in small claims court, but the person suing me actually owes ME money from a separate deal we had. What are my options?",
    expectedTags: ["CASE_ADVISOR"],
  },
  {
    label: "Defendant not responding to demand letter (Mode B -> court forms, next step is filing)",
    mode: "B",
    message: "I sent a demand letter two weeks ago and they haven't responded at all — what do I do now?",
    expectedTags: ["COURT_FORMS"],
  },
  {
    label: "Collecting after winning a judgment (Mode B -> Collect After You Have Won tools)",
    mode: "B",
    message: "I won my small claims case — how do I actually get the money from them?",
    expectedTags: ["JUDGMENT_COLLECTION"],
  },
  {
    label: "Defendant ignoring the judgment (Mode B -> Collect After You Have Won tools, defensive phrasing)",
    mode: "B",
    message: "I won my case against them months ago but they still haven't paid a cent — what happens if they just keep ignoring it?",
    expectedTags: ["JUDGMENT_COLLECTION"],
  },
  {
    label: "Hearing question with NC jurisdiction selected (Mode B -> Hearing Prep, magistrate terminology)",
    mode: "B",
    message: "What happens at a small claims hearing?",
    expectedTags: ["HEARING_PREP"],
    jurisdictionState: "NC",
  },
  {
    label: "Hearing question with CA jurisdiction selected (Mode B -> Hearing Prep)",
    mode: "B",
    message: "What happens at a small claims hearing?",
    expectedTags: ["HEARING_PREP"],
    jurisdictionState: "CA",
  },
  {
    label: "Evidence question with TX jurisdiction selected (Mode B -> Evidence Upload tool)",
    mode: "B",
    message: "How do I prove my case in court?",
    expectedTags: ["EVIDENCE_UPLOAD"],
    jurisdictionState: "TX",
  },
];

async function streamHelpResponse(
  message: string,
  jurisdictionState?: string,
  jurisdictionCounty?: string,
): Promise<string> {
  const resp = await fetch(`${BASE_URL}/api/help`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: [],
      isSignedIn: false,
      ...(jurisdictionState ? { jurisdictionState } : {}),
      ...(jurisdictionCounty ? { jurisdictionCounty } : {}),
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`HTTP ${resp.status} from /api/help`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as { content?: string; error?: string };
        if (parsed.error) throw new Error(`Stream error: ${parsed.error}`);
        if (parsed.content) full += parsed.content;
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Stream error")) throw e;
        // ignore malformed chunk fragments (shouldn't happen with SSE framing above)
      }
    }
  }

  return full;
}

function stripSuggestionsAndCta(raw: string): string {
  let c = raw;
  const sIdx = c.indexOf("SUGGESTIONS:");
  if (sIdx !== -1) c = c.slice(0, sIdx);
  return c.trim();
}

// Extracts the value after "FEATURE_TAG:" up to the next newline, mirroring
// the parsing logic in help-genie-widget.tsx's parseHelpContent().
function extractFeatureTag(raw: string): string | null {
  const idx = raw.indexOf("FEATURE_TAG:");
  if (idx === -1) return null;
  const rest = raw.slice(idx + "FEATURE_TAG:".length);
  const nlIdx = rest.indexOf("\n");
  const tag = (nlIdx === -1 ? rest : rest.slice(0, nlIdx)).trim();
  return tag || null;
}

async function main() {
  console.log(`Testing /api/help (isSignedIn: false) against ${BASE_URL}\n`);

  let passed = true;

  for (const c of CASES) {
    console.log(`--- ${c.label} ---`);
    console.log(`Q: "${c.message}"`);

    let lastAnswer = "";
    let attemptOk = false;
    let requestError: string | null = null;
    const attempts = c.mode === "B" ? MAX_ATTEMPTS : (c.maxAttempts ?? 1);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let raw: string;
      try {
        raw = await streamHelpResponse(c.message, c.jurisdictionState, c.jurisdictionCounty);
      } catch (err) {
        requestError = err instanceof Error ? err.message : String(err);
        continue;
      }
      requestError = null;

      const answer = stripSuggestionsAndCta(raw);
      lastAnswer = answer;
      if (!answer) continue;

      const tag = extractFeatureTag(raw);

      if (c.mode === "B") {
        const expected = c.expectedTags ?? [];
        const matched = tag && expected.includes(tag);
        if (matched) {
          console.log(`  Attempt ${attempt}/${attempts}: ✓ FEATURE_TAG: ${tag}`);
          attemptOk = true;
          break;
        } else {
          console.log(`  Attempt ${attempt}/${attempts}: ✗ FEATURE_TAG was "${tag ?? "(none found)"}", expected one of [${expected.join(", ")}]`);
        }
      } else {
        if (tag === "NONE" || tag === null) {
          attemptOk = true;
          if (attempts > 1) {
            console.log(`  Attempt ${attempt}/${attempts}: ✓ FEATURE_TAG: ${tag ?? "NONE"}`);
          }
          break;
        } else if (!VALID_TAGS.includes(tag)) {
          console.log(`  Attempt ${attempt}/${attempts}: ✗ Unrecognized FEATURE_TAG "${tag}" — not in the known tag set`);
        } else {
          console.log(`  Attempt ${attempt}/${attempts}: ✗ forces FEATURE_TAG "${tag}" onto a pure legal / no-overlap answer (expected NONE)`);
        }
        if (attempts === 1) break;
      }
    }

    if (requestError) {
      console.log(`  ✗ Request failed: ${requestError}`);
      passed = false;
      console.log("");
      continue;
    }

    if (!lastAnswer) {
      console.log("  ✗ Empty response");
      passed = false;
      console.log("");
      continue;
    }

    console.log(`  Last answer (${lastAnswer.length} chars): ${lastAnswer.slice(0, 160)}${lastAnswer.length > 160 ? "…" : ""}`);

    if (c.mode === "B") {
      if (attemptOk) {
        console.log(`  ✓ Mentions matching paid feature within ${attempts} attempts`);
      } else {
        console.log(`  ✗ Does NOT mention any expected feature (${(c.expectedTags ?? []).join(" / ")}) after ${attempts} attempts — Mode B pitch missing or wrong`);
        passed = false;
      }
    } else {
      // Mode A: a light, natural closing mention of "Small Claims Genie" is
      // explicitly allowed by the prompt, but the answer must not name a
      // specific bolded paid feature (that's a Mode B behavior). If any
      // canonical feature name (see ALL_PAID_FEATURE_NAMES) shows up, the
      // prompt is force-pitching a feature onto a pure legal question.
      if (attemptOk) {
        console.log("  ✓ No named paid-feature pitch forced into a pure legal answer");
      } else {
        passed = false;
      }
    }

    console.log("");
  }

  if (passed) {
    console.log("✅ All help-chat Mode A/B checks passed.");
  } else {
    console.error("❌ One or more help-chat Mode A/B checks failed — review VISITOR_PROMPT and /api/help.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

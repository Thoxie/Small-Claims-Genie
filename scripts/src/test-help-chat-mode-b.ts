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
 */

const BASE_URL = process.env.API_BASE_URL ?? "http://localhost:80";

// Canonical bolded feature names from the VISITOR_PROMPT's Mode B mapping.
// A Mode A (pure legal/procedural) answer must not name any of these —
// doing so means the prompt is force-pitching a paid feature onto a
// question that doesn't overlap one, which the prompt explicitly forbids.
const ALL_PAID_FEATURE_NAMES = [
  "demand letter",
  "court forms",
  "process server",
  "hearing prep",
  "mock trial",
  "evidence upload",
  "case advisor",
  "deadline tracking",
];

interface Case {
  label: string;
  mode: "A" | "B";
  message: string;
  // Mode B only: at least one of these feature-name substrings must appear
  // (case-insensitive) in the response for the test to pass.
  expectedFeatureNames?: string[];
}

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
    expectedFeatureNames: ["demand letter"],
  },
  {
    label: "Filing (Mode B -> court forms)",
    mode: "B",
    message: "How do I file a small claims case?",
    expectedFeatureNames: ["court forms"],
  },
  {
    label: "Serving the defendant (Mode B -> process server)",
    mode: "B",
    message: "How do I serve the defendant with my lawsuit?",
    expectedFeatureNames: ["process server"],
  },
  {
    label: "Hearing prep (Mode B -> Hearing Prep / Mock Trial)",
    mode: "B",
    message: "What do I say to the judge at the hearing?",
    expectedFeatureNames: ["hearing prep", "mock trial"],
  },
  {
    label: "Organizing evidence / proving case (Mode B -> Evidence Upload tool)",
    mode: "B",
    message: "How do I prove my case in court?",
    expectedFeatureNames: ["evidence upload"],
  },
];

async function streamHelpResponse(message: string): Promise<string> {
  const resp = await fetch(`${BASE_URL}/api/help`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: [],
      isSignedIn: false,
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

// The live model runs at temperature 0.5, so exact wording varies run to run.
// To avoid flaking on harmless phrasing variance while still catching a real
// regression (prompt or model change that stops pitching the feature at all),
// each Mode B case gets up to MAX_ATTEMPTS tries and passes if any attempt
// contains the expected feature name.
const MAX_ATTEMPTS = 3;

async function main() {
  console.log(`Testing /api/help (isSignedIn: false) against ${BASE_URL}\n`);

  let passed = true;

  for (const c of CASES) {
    console.log(`--- ${c.label} ---`);
    console.log(`Q: "${c.message}"`);

    let lastAnswer = "";
    let attemptOk = false;
    let requestError: string | null = null;
    const attempts = c.mode === "B" ? MAX_ATTEMPTS : 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let raw: string;
      try {
        raw = await streamHelpResponse(c.message);
      } catch (err) {
        requestError = err instanceof Error ? err.message : String(err);
        continue;
      }
      requestError = null;

      const answer = stripSuggestionsAndCta(raw);
      lastAnswer = answer;
      if (!answer) continue;

      if (c.mode === "B") {
        const names = c.expectedFeatureNames ?? [];
        const matched = names.find((n) => answer.toLowerCase().includes(n.toLowerCase()));
        if (matched) {
          console.log(`  Attempt ${attempt}/${attempts}: ✓ mentions "${matched}"`);
          attemptOk = true;
          break;
        } else {
          console.log(`  Attempt ${attempt}/${attempts}: ✗ no expected feature mentioned yet`);
        }
      } else {
        const forcedFeature = ALL_PAID_FEATURE_NAMES.find((n) => answer.toLowerCase().includes(n.toLowerCase()));
        if (forcedFeature) {
          console.log(`  ✗ forces named feature "${forcedFeature}" into a pure legal answer`);
        } else {
          attemptOk = true;
        }
        break;
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
        console.log(`  ✗ Does NOT mention any expected feature (${(c.expectedFeatureNames ?? []).join(" / ")}) after ${attempts} attempts — Mode B pitch missing or wrong`);
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

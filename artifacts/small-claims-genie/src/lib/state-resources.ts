import { STATE_FACTS, formatFilingFeeTiersParen, type StateCode } from "@workspace/state-facts";

export type ResourceStateCode = StateCode;

export interface StateResourceInfo {
  code: ResourceStateCode;
  name: string;
  flagEmoji: string;
  courtBranchName: string;
  selfHelpUrl: string;
  selfHelpLabel: string;
  claimLimit: string;
  statuteOfLimitations: { label: string; period: string }[];
  filingFeeSummary: string;
  serviceOfProcess: string;
  formsUsed: { title: string; desc: string }[];
  appealNote: string;
}

// Facts below (claim limits, statutes of limitations, filing fees, service of process,
// forms) are sourced from the single canonical `@workspace/state-facts` package, which
// is also consumed by the production AI system prompts (artifacts/api-server/src/prompts/
// chat-prompt.ts / help-chat-prompt.ts). Update facts there — never hand-edit numbers here.
// See replit.md preference #4.
const CLAIM_LIMIT_PREFIX: Record<ResourceStateCode, string> = {
  CA: "Up to",
  FL: "Up to",
  TX: "Up to",
  IL: "Up to",
  NC: "Up to",
  VA: "Up to",
  NJ: "Up to",
  WA: "Up to",
};

const CLAIM_LIMIT_SUFFIX: Record<ResourceStateCode, string> = {
  CA: "",
  FL: ", exclusive of costs, interest, and attorneys' fees",
  TX: ", exclusive of interest, attorneys' fees, and court costs",
  IL: ", exclusive of costs and interest",
  NC: ", exclusive of interest and court costs",
  VA: "",
  NJ: "",
  WA: "",
};

const SOL_LABEL_OVERRIDES: Record<string, string> = {
  "Oral contract": "Oral agreement",
};

// TX/NC service-of-process copy shares a canonical clause with STATE_FACTS
// (the constable/sheriff-serves clause; the $ service fee) via string
// extraction below, so the underlying numbers can never drift out of sync
// even though the surrounding sentence is phrased for this card's format.
const TX_SERVICE_METHOD_CLAUSE = STATE_FACTS.TX.serviceMethodsText.split(" — ")[0];
const NC_SHERIFF_FEE = STATE_FACTS.NC.serviceMethodsText.match(/\$[\d,]+/)?.[0] ?? STATE_FACTS.NC.serviceMethodsText;

const SERVICE_OF_PROCESS_TEXT: Record<ResourceStateCode, string> = {
  CA: `${STATE_FACTS.CA.serviceMethodsText}. Must be completed at least 15 days before the hearing (20 if the defendant lives in a different county).`,
  FL: `${STATE_FACTS.FL.serviceMethodsText}. ${STATE_FACTS.FL.serviceDeadlineText.charAt(0).toUpperCase()}${STATE_FACTS.FL.serviceDeadlineText.slice(1)}.`.replace("Must be filed", "Proof of service must be filed"),
  TX: `${TX_SERVICE_METHOD_CLAUSE}, typically within a few days.`,
  IL: `You arrange service through the sheriff or a private process server (roughly $60). Must be completed ${STATE_FACTS.IL.serviceDeadlineText.replace(" (hearing date)", "")}.`,
  NC: `The sheriff serves the defendant after filing (${NC_SHERIFF_FEE} fee paid to the Clerk at filing).`,
  VA: `${STATE_FACTS.VA.serviceMethodsText}. Must be completed ${STATE_FACTS.VA.serviceDeadlineText}.`,
  NJ: `${STATE_FACTS.NJ.serviceMethodsText}. Deadline: ${STATE_FACTS.NJ.serviceDeadlineText}`,
  WA: `${STATE_FACTS.WA.serviceMethodsText}. Deadline: ${STATE_FACTS.WA.serviceDeadlineText}`,
};

const FILING_FEE_SUMMARY_OVERRIDES: Record<ResourceStateCode, string | undefined> = {
  CA: undefined,
  FL: undefined,
  TX: `Roughly ${STATE_FACTS.TX.filingFeeTiers[0].fee}–${STATE_FACTS.TX.filingFeeTiers[STATE_FACTS.TX.filingFeeTiers.length - 1].fee} depending on claim amount and county (Justice Court fee schedule)`,
  IL: `Roughly ${STATE_FACTS.IL.filingFeeTiers[0].fee} depending on county`,
  NC: undefined,
  VA: "UNKNOWN — needs verification. Virginia does not publish a single statewide filing fee; amounts vary by locality and case type. Use the GDC Civil Filing Fee Calculator or contact your local clerk before filing.",
  NJ: undefined,
  WA: "UNKNOWN — needs verification. Washington's exact statewide filing fee was not independently confirmed; verify with RCW 12.40 and the specific county district court before filing.",
};

// STATE_FACTS.forms is the exhaustive form catalog used by the AI prompts and
// form-generation engine (every form the app can produce for that state). The
// Resources page only ever showed a curated subset by form id — pull that
// subset from the canonical catalog by id instead of duplicating titles/
// descriptions, so wording still comes from one place, but the visible list
// doesn't silently grow every time a new form is added to the catalog.
const FORMS_USED_IDS: Record<ResourceStateCode, string[]> = {
  CA: ["SC-100", "SC-104", "SC-120", "FW-001"],
  FL: ["Statement of Claim", "Summons", "Fee Waiver"],
  TX: ["Small Claims Petition", "Citation", "Return of Service", "Fee Waiver (Statement of Inability to Afford Payment of Court Costs)"],
  IL: ["Small Claims Complaint", "Summons", "Proof of Service", "Fee Waiver", "Letter to Sheriff"],
  NC: ["AOC-CVM-200", "AOC-CVM-100", "AOC-G-106"],
  VA: ["DC-402", "DC-409"],
  NJ: ["Small Claims Complaint", "Appendix XI-A(2)", "Fee Waiver (Application to Proceed as an Indigent)"],
  WA: ["Notice of Small Claim", "Small Claims Calendar Notice"],
};

// The Resources card uses the short "Fee Waiver" label while the canonical
// catalog spells out the official NC/VA form name for AI-prompt purposes.
const FORMS_NAME_OVERRIDE: Partial<Record<string, string>> = {
  "AOC-G-106": "Fee Waiver",
  "DC-409": "Fee Waiver",
};

function buildStateResource(code: ResourceStateCode): StateResourceInfo {
  const facts = STATE_FACTS[code];
  return {
    code,
    name: facts.name,
    flagEmoji: facts.flagEmoji,
    courtBranchName: facts.courtBranchName,
    selfHelpUrl: facts.selfHelpUrl,
    selfHelpLabel: facts.selfHelpLabel,
    claimLimit: `${CLAIM_LIMIT_PREFIX[code]} ${facts.claimLimitText}${CLAIM_LIMIT_SUFFIX[code]}`,
    statuteOfLimitations: facts.statuteOfLimitations.map((sol) => ({
      label: SOL_LABEL_OVERRIDES[sol.label] ?? sol.label,
      period: sol.period,
    })),
    filingFeeSummary:
      FILING_FEE_SUMMARY_OVERRIDES[code] ??
      `${formatFilingFeeTiersParen(facts)}${facts.filingFeeNote ? `, ${facts.filingFeeNote}` : ""}`,
    serviceOfProcess: SERVICE_OF_PROCESS_TEXT[code],
    formsUsed: FORMS_USED_IDS[code].map((key) => {
      const form = facts.forms.find((f) => (f.id ? f.id === key : f.name === key));
      if (!form) {
        throw new Error(`state-resources: no STATE_FACTS form found for ${code} key "${key}"`);
      }
      const name = FORMS_NAME_OVERRIDE[form.id] ?? form.name;
      return {
        title: form.id ? `${form.id} — ${name}` : name,
        desc: form.desc,
      };
    }),
    appealNote: facts.appealNote,
  };
}

export const STATE_RESOURCES: Record<ResourceStateCode, StateResourceInfo> = {
  CA: buildStateResource("CA"),
  FL: buildStateResource("FL"),
  TX: buildStateResource("TX"),
  IL: buildStateResource("IL"),
  NC: buildStateResource("NC"),
  VA: buildStateResource("VA"),
  NJ: buildStateResource("NJ"),
  WA: buildStateResource("WA"),
};

// NJ and WA are intentionally NOT yet in the public state picker order below --
// they are in Phase 1 (data layer only) of the state-expansion process. See
// .agents/skills/state-expansion/SKILL.md. Do not add them here until Phase 2
// is explicitly greenlit (facts verified + forms pipeline decided).
export const STATE_ORDER: ResourceStateCode[] = ["CA", "FL", "IL", "NC", "TX", "VA"];

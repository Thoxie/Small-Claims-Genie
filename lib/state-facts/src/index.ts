// Canonical, single-source-of-truth data for every legal fact that varies by
// supported state. Both the AI prompts (artifacts/api-server/src/prompts/*.ts)
// and the public Resources page (artifacts/small-claims-genie/src/lib/state-resources.ts)
// derive their state-specific numbers/citations from this module so they can
// never drift apart. See replit.md preference #4.
//
// This module intentionally does NOT try to own every sentence of prose in the
// prompts (e.g. step-by-step filing workflows, app-navigation copy). It owns the
// underlying FACTS (claim limits, statutes of limitations, filing fees, service
// rules, forms, appeal windows, collection tools, citations). Consuming files
// interpolate these facts into their own prose so tone/structure per audience
// (AI advisor vs. AI visitor triage vs. Resources page) can stay tailored while
// the numbers themselves are guaranteed consistent.

export type StateCode = "CA" | "FL" | "TX" | "IL" | "NC";

export interface SolPeriod {
  /** e.g. "Written contract" */
  label: string;
  /** e.g. "4 years" */
  period: string;
}

export interface FilingFeeTier {
  /** e.g. "under $100" or "≤$200" */
  label: string;
  /** e.g. "$55" */
  fee: string;
}

export interface StateForm {
  /** Official form id/number, e.g. "SC-100". Empty string if the state has no numbered form. */
  id: string;
  name: string;
  desc: string;
}

export interface StateFacts {
  code: StateCode;
  name: string;
  flagEmoji: string;
  /** e.g. "Justice of the Peace (JP) courts" / "Circuit Court" / "District Court (Small Claims Division)" */
  courtSystemName: string;
  courtBranchName: string;
  selfHelpUrl: string;
  selfHelpLabel: string;

  claimLimitText: string;
  claimLimitCitation?: string;

  attorneysAllowed: boolean;
  attorneysNote: string;

  filingFeeTiers: FilingFeeTier[];
  filingFeeCitation?: string;
  /** Extra filing-fee context, e.g. "plus summons/service/e-filing fees" */
  filingFeeNote?: string;
  feesRecoverableCitation?: string;

  statuteOfLimitations: SolPeriod[];
  statuteOfLimitationsCitation?: string;

  serviceDeadlineText: string;
  serviceMethodsText: string;
  serviceOfProcessCitation?: string;

  forms: StateForm[];

  judgmentValidityYears: number;
  judgmentRenewable: boolean;
  collectionToolsText: string;

  appealNote: string;

  keyCounties?: string[];
}

export const STATE_ORDER: StateCode[] = ["CA", "FL", "TX", "IL", "NC"];

export const STATE_FACTS: Record<StateCode, StateFacts> = {
  CA: {
    code: "CA",
    name: "California",
    flagEmoji: "🌴",
    courtSystemName: "small claims court",
    courtBranchName: "California Courts — Judicial Branch",
    selfHelpUrl: "https://www.courts.ca.gov/selfhelp-smallclaims.htm",
    selfHelpLabel: "California Courts Small Claims Self-Help",

    claimLimitText: "$12,500 for individuals, $6,250 for businesses",
    claimLimitCitation: undefined,

    attorneysAllowed: false,
    attorneysNote: "Lawyers are NOT allowed at California small claims hearings (CA CCP §116.530) — never suggest hiring one for the hearing",

    filingFeeTiers: [
      { label: "under $1,500", fee: "$30" },
      { label: "$1,500–$5,000", fee: "$50" },
      { label: "over $5,000", fee: "$75" },
    ],
    filingFeeNote: "waivable via FW-001",
    feesRecoverableCitation: undefined,

    statuteOfLimitations: [
      { label: "Written contract", period: "4 years" },
      { label: "Oral contract", period: "2 years" },
      { label: "Property damage", period: "3 years" },
      { label: "Personal injury", period: "2 years" },
    ],

    serviceDeadlineText: "at least 15 days before hearing (same county) or 20 days (different county)",
    serviceMethodsText: "Certified mail (~$15), sheriff (~$40+), or a registered process server",
    serviceOfProcessCitation: "CCP §116.340",

    forms: [
      { id: "SC-100", name: "Plaintiff's Claim and Order to Go to Small Claims Court", desc: "The main form you file to start your small claims case." },
      { id: "SC-103", name: "Fictitious Business Name Declaration", desc: "Required when any party operates under a DBA (\"doing business as\") name." },
      { id: "MC-030", name: "Declaration", desc: "Attaches extra facts or statements that don't fit on SC-100." },
      { id: "FW-001", name: "Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
      { id: "SC-104", name: "Proof of Service", desc: "Required after serving the defendant with court papers." },
      { id: "SC-120", name: "Defendant's Claim and Order", desc: "If the defendant wants to counter-sue you." },
      { id: "SC-150", name: "Request to Postpone Trial", desc: "Postpones the hearing date if more time is needed." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: true,
    collectionToolsText: "wage garnishment, bank levy, property lien (EJ-130 writ of execution)",

    appealNote: "You (as plaintiff) generally cannot appeal a small claims judgment, but the defendant can appeal within 30 days.",
  },

  FL: {
    code: "FL",
    name: "Florida",
    flagEmoji: "☀️",
    courtSystemName: "small claims court",
    courtBranchName: "Florida Courts — Judicial Branch",
    selfHelpUrl: "https://www.flcourts.gov",
    selfHelpLabel: "Florida Courts",

    claimLimitText: "$8,000 or less",
    claimLimitCitation: "Fla. Stat. Ch. 34",

    attorneysAllowed: true,
    attorneysNote: "Attorneys ARE allowed but not required",

    filingFeeTiers: [
      { label: "under $100", fee: "$55" },
      { label: "$101–$500", fee: "$80" },
      { label: "$501–$2,500", fee: "$175" },
      { label: "over $2,500", fee: "$300" },
    ],
    filingFeeCitation: "Fla. Stat. 34.041",
    filingFeeNote: "plus summons/service/e-filing fees",
    feesRecoverableCitation: "Fla. Stat. § 57.041",

    statuteOfLimitations: [
      { label: "Written contract", period: "5 years" },
      { label: "Oral contract", period: "4 years" },
      { label: "Property damage", period: "4 years" },
      { label: "Personal injury", period: "2 years" },
    ],

    serviceDeadlineText: "must be filed at least 5 days before the pretrial conference",
    serviceMethodsText: "Sheriff, a certified process server, or certified mail (Florida residents only)",

    forms: [
      { id: "", name: "Statement of Claim", desc: "The main form you file to start your case (statewide or county-specific version depending on your county)." },
      { id: "", name: "Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { id: "", name: "Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 20,
    judgmentRenewable: false,
    collectionToolsText: "garnishment (wages/bank), writ of execution, judgment lien certificate, Fact Information Sheet (Form 7.343)",

    appealNote: "Appeals must generally be filed within 30 days of the final judgment.",
  },

  TX: {
    code: "TX",
    name: "Texas",
    flagEmoji: "🤠",
    courtSystemName: "Justice of the Peace (JP) courts",
    courtBranchName: "Texas Judicial Branch",
    selfHelpUrl: "https://www.txcourts.gov",
    selfHelpLabel: "Texas Courts",

    claimLimitText: "$20,000",
    claimLimitCitation: "Tex. Gov't Code § 27.031",

    attorneysAllowed: true,
    attorneysNote: "Attorneys ARE allowed at Texas JP court hearings; self-represented parties are common and welcomed",

    filingFeeTiers: [
      { label: "≤$200", fee: "$46" },
      { label: "$201–$500", fee: "$71" },
      { label: "$501–$1,000", fee: "$121" },
      { label: "$1,001–$5,000", fee: "$221" },
      { label: "$5,001–$10,000", fee: "$271" },
      { label: "$10,001–$20,000", fee: "$321" },
    ],
    filingFeeCitation: "Tex. Gov't Code § 118.121",
    feesRecoverableCitation: "Tex. R. Civ. P. 131",

    statuteOfLimitations: [
      { label: "Written contract", period: "4 years" },
      { label: "Oral contract", period: "4 years" },
      { label: "Property damage", period: "2 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    statuteOfLimitationsCitation: "Tex. Civ. Prac. & Rem. Code § 16.003–16.004",

    serviceDeadlineText: "the court issues a citation the same day or next business day; the constable or sheriff typically serves the defendant within ~3 business days; trial is then set 20–45 days after service (typically 25–50 days total from filing to trial)",
    serviceMethodsText: "The court issues a citation; a constable or sheriff serves the defendant — the plaintiff does not arrange service",

    forms: [
      { id: "", name: "Small Claims Petition", desc: "The main form you file to start your case in Justice Court." },
      { id: "", name: "Citation", desc: "Court-issued notice served on the defendant." },
      { id: "", name: "Return of Service", desc: "Proof the defendant was properly served." },
      { id: "", name: "Fee Waiver (Statement of Inability to Afford Payment of Court Costs)", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: true,
    collectionToolsText: "abstract of judgment (property lien), writ of execution (non-exempt personal property), bank levy — wages are EXEMPT from garnishment in Texas",

    appealNote: "Appeals from Justice Court are generally filed within 21 days of judgment.",
  },

  IL: {
    code: "IL",
    name: "Illinois",
    flagEmoji: "🏙️",
    courtSystemName: "Circuit Court",
    courtBranchName: "Illinois Courts — Judicial Branch",
    selfHelpUrl: "https://www.illinoiscourts.gov",
    selfHelpLabel: "Illinois Courts",

    claimLimitText: "$10,000",
    claimLimitCitation: "735 ILCS 5/Art. II",

    attorneysAllowed: true,
    attorneysNote: "Attorneys ARE allowed at Illinois small claims hearings; self-represented plaintiffs are common",

    filingFeeTiers: [
      { label: "typical range", fee: "$189–$264" },
    ],
    filingFeeNote: "varies by county and claim amount; Cook County fees are higher — check the Clerk of the Circuit Court website",
    feesRecoverableCitation: "735 ILCS 5/5-108",

    statuteOfLimitations: [
      { label: "Written contract", period: "10 years", },
      { label: "Oral contract", period: "5 years" },
      { label: "Property damage", period: "5 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    statuteOfLimitationsCitation: "written 735 ILCS 5/13-206, oral/property 735 ILCS 5/13-205, personal injury 735 ILCS 5/13-202",

    serviceDeadlineText: "at least 3 days before the return date (hearing date)",
    serviceMethodsText: "The plaintiff arranges service — the court does NOT serve the defendant automatically; sheriff, licensed process server, or substitute service",

    forms: [
      { id: "", name: "Small Claims Complaint", desc: "The main form you file to start your case." },
      { id: "", name: "Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { id: "", name: "Proof of Service", desc: "Confirms the defendant was properly served." },
      { id: "", name: "Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
      { id: "", name: "Letter to Sheriff", desc: "Instructs the sheriff on serving the defendant." },
    ],

    judgmentValidityYears: 7,
    judgmentRenewable: true,
    collectionToolsText: "citation to discover assets, wage deduction order (wage garnishment), bank account citation, judgment lien on real property",

    appealNote: "Appeals are generally filed within 30 days of judgment.",

    keyCounties: ["Cook (Chicago)", "DuPage (Wheaton)", "Lake (Waukegan)", "Will (Joliet)", "Kane (Geneva)", "Winnebago (Rockford)", "Champaign (Urbana)", "Sangamon (Springfield)"],
  },

  NC: {
    code: "NC",
    name: "North Carolina",
    flagEmoji: "🌲",
    courtSystemName: "District Court (Small Claims Division)",
    courtBranchName: "North Carolina Judicial Branch",
    selfHelpUrl: "https://www.nccourts.gov",
    selfHelpLabel: "North Carolina Courts",

    claimLimitText: "$10,000",
    claimLimitCitation: "G.S. 7A-210",

    attorneysAllowed: true,
    attorneysNote: "Attorneys ARE allowed at NC small claims hearings; self-represented plaintiffs are common and welcomed by magistrates",

    filingFeeTiers: [
      { label: "all claim amounts", fee: "$96" },
    ],
    filingFeeCitation: "G.S. 7A-311",
    filingFeeNote: "flat statewide rate, the same regardless of whether you are suing for $500 or $10,000",
    feesRecoverableCitation: "G.S. 7A-305",

    statuteOfLimitations: [
      { label: "Written contract", period: "3 years" },
      { label: "Oral contract", period: "3 years" },
      { label: "Property damage", period: "3 years" },
      { label: "Personal injury", period: "3 years" },
    ],
    statuteOfLimitationsCitation: "G.S. 1-52",

    serviceDeadlineText: "the sheriff serves the defendant after you file; you do NOT arrange service yourself",
    serviceMethodsText: "Sheriff service only — $30 per defendant, paid at filing",
    serviceOfProcessCitation: "G.S. 7A-311",

    forms: [
      { id: "AOC-CVM-200", name: "Complaint", desc: "The main form you file to start your case in Magistrate Court." },
      { id: "AOC-CVM-100", name: "Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { id: "AOC-G-106", name: "Fee Waiver (Petition to Sue as Indigent)", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: false,
    collectionToolsText: "writ of execution (sheriff seizes non-exempt property), bank account garnishment, judgment lien on real property (file abstract with Register of Deeds) — NOTE: wage garnishment is NOT available for private civil debt in North Carolina (G.S. 110-136)",

    appealNote: "Appeals from Magistrate Court are generally filed within 10 days of judgment, and are heard fresh (\"de novo\") in District Court (G.S. 7A-228).",

    keyCounties: ["Mecklenburg (Charlotte)", "Wake (Raleigh)", "Guilford (Greensboro)", "Forsyth (Winston-Salem)", "Cumberland (Fayetteville)", "Durham", "Buncombe (Asheville)", "New Hanover (Wilmington)"],
  },
};

export function getStateFacts(code: StateCode): StateFacts {
  return STATE_FACTS[code];
}

/** e.g. "written contracts 4 years, oral contracts 2 years, property damage 3 years, personal injury 2 years" */
export function formatSolLine(facts: StateFacts, options?: { lowercaseFirst?: boolean }): string {
  const parts = facts.statuteOfLimitations.map((s) => {
    const label = s.label.toLowerCase().replace("contract", "contracts").replace("contractss", "contracts");
    return `${label} ${s.period}`;
  });
  const joined = parts.join(", ");
  if (options?.lowercaseFirst === false) {
    return joined.charAt(0).toUpperCase() + joined.slice(1);
  }
  return joined;
}

/** e.g. "$30 (claims under $1,500), $50 ($1,500–$5,000), $75 (over $5,000)" */
export function formatFilingFeeTiersParen(facts: StateFacts): string {
  return facts.filingFeeTiers.map((t) => `${t.fee} (${t.label.replace(/^under /, "claims under ")})`).join(", ");
}

/** e.g. "under $100: $55 | $101–$500: $80 | $501–$2,500: $175 | over $2,500: $300" */
export function formatFilingFeeTiersPipe(facts: StateFacts): string {
  return facts.filingFeeTiers.map((t) => `${t.label}: ${t.fee}`).join(" | ");
}

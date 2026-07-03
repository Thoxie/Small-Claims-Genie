export type ResourceStateCode = "CA" | "FL" | "IL" | "NC" | "TX";

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
// forms) mirror the same figures already used in the production AI system prompts
// (artifacts/api-server/src/prompts/chat-prompt.ts / help-chat-prompt.ts) and the
// form-generation engine (artifacts/api-server/src/forms/definitions). Keep both in
// sync if either changes — see replit.md preference #4.
export const STATE_RESOURCES: Record<ResourceStateCode, StateResourceInfo> = {
  CA: {
    code: "CA",
    name: "California",
    flagEmoji: "🌴",
    courtBranchName: "California Courts — Judicial Branch",
    selfHelpUrl: "https://www.courts.ca.gov/selfhelp-smallclaims.htm",
    selfHelpLabel: "California Courts Small Claims Self-Help",
    claimLimit: "Up to $12,500 for individuals, $6,250 for businesses",
    statuteOfLimitations: [
      { label: "Written contract", period: "4 years" },
      { label: "Oral agreement", period: "2 years" },
      { label: "Property damage", period: "3 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    filingFeeSummary: "$30 (claims under $1,500), $50 ($1,500–$5,000), $75 (over $5,000)",
    serviceOfProcess: "Certified mail (~$15), sheriff (~$40+), or a registered process server. Must be completed at least 15 days before the hearing (20 if the defendant lives in a different county).",
    formsUsed: [
      { title: "SC-100 — Plaintiff's Claim and Order", desc: "The main form you file to start your small claims case." },
      { title: "SC-104 — Proof of Service", desc: "Required after serving the defendant with court papers." },
      { title: "SC-120 — Defendant's Claim and Order", desc: "If the defendant wants to counter-sue you." },
      { title: "FW-001 — Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
    ],
    appealNote: "You (as plaintiff) generally cannot appeal a small claims judgment, but the defendant can appeal within 30 days.",
  },
  FL: {
    code: "FL",
    name: "Florida",
    flagEmoji: "☀️",
    courtBranchName: "Florida Courts — Judicial Branch",
    selfHelpUrl: "https://www.flcourts.gov",
    selfHelpLabel: "Florida Courts",
    claimLimit: "Up to $8,000, exclusive of costs, interest, and attorneys' fees",
    statuteOfLimitations: [
      { label: "Written contract", period: "5 years" },
      { label: "Oral agreement", period: "4 years" },
      { label: "Property damage", period: "4 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    filingFeeSummary: "$55 (under $100), $80 ($101–$500), $175 ($501–$2,500), $300 (over $2,500), plus summons/service/e-filing fees",
    serviceOfProcess: "Sheriff, a certified process server, or certified mail (Florida residents only). Proof of service must be filed at least 5 days before the pretrial conference.",
    formsUsed: [
      { title: "Statement of Claim", desc: "The main form you file to start your case (statewide or county-specific version depending on your county)." },
      { title: "Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { title: "Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
    ],
    appealNote: "Appeals must generally be filed within 30 days of the final judgment.",
  },
  TX: {
    code: "TX",
    name: "Texas",
    flagEmoji: "🤠",
    courtBranchName: "Texas Judicial Branch",
    selfHelpUrl: "https://www.txcourts.gov",
    selfHelpLabel: "Texas Courts",
    claimLimit: "Up to $20,000, exclusive of interest, attorneys' fees, and court costs",
    statuteOfLimitations: [
      { label: "Written contract", period: "4 years" },
      { label: "Oral agreement", period: "4 years" },
      { label: "Property damage", period: "2 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    filingFeeSummary: "Roughly $46–$321 depending on claim amount and county (Justice Court fee schedule)",
    serviceOfProcess: "The court issues a citation; a constable or sheriff serves the defendant, typically within a few days.",
    formsUsed: [
      { title: "Small Claims Petition", desc: "The main form you file to start your case in Justice Court." },
      { title: "Citation", desc: "Court-issued notice served on the defendant." },
      { title: "Return of Service", desc: "Proof the defendant was properly served." },
      { title: "Fee Waiver (Statement of Inability to Afford Payment of Court Costs)", desc: "Apply to waive filing fees if you cannot afford them." },
    ],
    appealNote: "Appeals from Justice Court are generally filed within 21 days of judgment.",
  },
  IL: {
    code: "IL",
    name: "Illinois",
    flagEmoji: "🏙️",
    courtBranchName: "Illinois Courts — Judicial Branch",
    selfHelpUrl: "https://www.illinoiscourts.gov",
    selfHelpLabel: "Illinois Courts",
    claimLimit: "Up to $10,000, exclusive of costs and interest",
    statuteOfLimitations: [
      { label: "Written contract", period: "10 years" },
      { label: "Oral agreement", period: "5 years" },
      { label: "Property damage", period: "5 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    filingFeeSummary: "Roughly $189–$264 depending on county",
    serviceOfProcess: "You arrange service through the sheriff or a private process server (roughly $60). Must be completed at least 3 days before the return date.",
    formsUsed: [
      { title: "Small Claims Complaint", desc: "The main form you file to start your case." },
      { title: "Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { title: "Proof of Service", desc: "Confirms the defendant was properly served." },
      { title: "Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
      { title: "Letter to Sheriff", desc: "Instructs the sheriff on serving the defendant." },
    ],
    appealNote: "Appeals are generally filed within 30 days of judgment.",
  },
  NC: {
    code: "NC",
    name: "North Carolina",
    flagEmoji: "🌲",
    courtBranchName: "North Carolina Judicial Branch",
    selfHelpUrl: "https://www.nccourts.gov",
    selfHelpLabel: "North Carolina Courts",
    claimLimit: "Up to $10,000, exclusive of interest and court costs",
    statuteOfLimitations: [
      { label: "Written contract", period: "3 years" },
      { label: "Oral agreement", period: "3 years" },
      { label: "Property damage", period: "3 years" },
      { label: "Personal injury", period: "3 years" },
    ],
    filingFeeSummary: "$96 flat rate statewide, for all claim amounts",
    serviceOfProcess: "The sheriff serves the defendant after filing ($30 fee paid to the Clerk at filing).",
    formsUsed: [
      { title: "AOC-CVM-200 — Complaint", desc: "The main form you file to start your case in Magistrate Court." },
      { title: "AOC-CVM-100 — Summons", desc: "Notifies the defendant of the lawsuit and the court date." },
      { title: "AOC-G-106 — Fee Waiver", desc: "Apply to waive filing fees if you cannot afford them." },
    ],
    appealNote: "Appeals from Magistrate Court are generally filed within 10 days of judgment, and are heard fresh (\"de novo\") in District Court.",
  },
};

export const STATE_ORDER: ResourceStateCode[] = ["CA", "FL", "IL", "NC", "TX"];

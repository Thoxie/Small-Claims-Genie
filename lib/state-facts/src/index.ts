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

export type StateCode = "CA" | "FL" | "TX" | "IL" | "NC" | "VA" | "NJ" | "WA" | "AZ";

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
  /** UI label for the county picker, e.g. "California County" / "Virginia County/City" */
  countyLabel: string;
  /** Short claim-limit badge text for compact pickers, e.g. "Up to $12,500" (see claimLimitText for the full legal text) */
  pickerSubText: string;

  claimLimitText: string;
  claimLimitCitation?: string;

  /** Title of the official who presides over the hearing, e.g. "judge" or "magistrate" (NC). Use this instead of hardcoding "judge" in any cross-state generic content. */
  hearingOfficialTitle: string;

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

  /** State-specific filing frequency cap, e.g. CA's "no more than 2 cases over $2,500 per 12 months" rule. */
  filingFrequencyCapText?: string;
}

export const STATE_ORDER: StateCode[] = ["CA", "FL", "IL", "NJ", "NC", "TX", "VA", "WA", "AZ"];

export const STATE_FACTS: Record<StateCode, StateFacts> = {
  CA: {
    code: "CA",
    name: "California",
    flagEmoji: "🌴",
    courtSystemName: "small claims court",
    courtBranchName: "California Courts — Judicial Branch",
    selfHelpUrl: "https://www.courts.ca.gov/selfhelp-smallclaims.htm",
    selfHelpLabel: "California Courts Small Claims Self-Help",
    countyLabel: "California County",
    pickerSubText: "Up to $12,500",

    claimLimitText: "$12,500 for individuals, $6,250 for businesses",
    claimLimitCitation: undefined,

    hearingOfficialTitle: "judge",

    attorneysAllowed: false,
    attorneysNote: "Lawyers are NOT allowed at California small claims hearings (CA CCP §116.530) — never suggest hiring one for the hearing",

    filingFrequencyCapText: "Individuals cannot file more than 2 cases over $2,500 per 12-month period",

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
    countyLabel: "Florida County",
    pickerSubText: "Up to $8,000",

    claimLimitText: "$8,000 or less",
    claimLimitCitation: "Fla. Stat. Ch. 34",

    hearingOfficialTitle: "judge",

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
    countyLabel: "Texas County",
    pickerSubText: "Up to $20,000",

    claimLimitText: "$20,000",
    claimLimitCitation: "Tex. Gov't Code § 27.031",

    hearingOfficialTitle: "judge",

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
    countyLabel: "Illinois County",
    pickerSubText: "Up to $10,000",

    claimLimitText: "$10,000",
    claimLimitCitation: "735 ILCS 5/Art. II",

    hearingOfficialTitle: "judge",

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
    countyLabel: "North Carolina County",
    pickerSubText: "Up to $10,000",

    claimLimitText: "$10,000",
    claimLimitCitation: "G.S. 7A-210",

    hearingOfficialTitle: "magistrate",

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

  VA: {
    code: "VA",
    name: "Virginia",
    flagEmoji: "🏛️",
    courtSystemName: "General District Court (Small Claims Division)",
    courtBranchName: "Virginia Judicial System",
    selfHelpUrl: "https://www.vacourts.gov",
    selfHelpLabel: "Virginia's Judicial System",
    countyLabel: "Virginia County/City",
    pickerSubText: "Up to $5,000",

    claimLimitText: "$5,000",
    claimLimitCitation: "Va. Code § 16.1-122.2",

    hearingOfficialTitle: "judge",

    attorneysAllowed: false,
    attorneysNote: "Attorneys are generally NOT allowed to represent parties in Virginia's Small Claims Division (Va. Code § 16.1-122.4) — never suggest hiring one for the hearing",

    filingFeeTiers: [
      { label: "varies by locality and claim type", fee: "UNKNOWN — needs verification" },
    ],
    filingFeeNote: "Virginia filing fees are set per General District Court and depend on case type and location — there is no single statewide dollar amount. Use the GDC Civil Filing Fee Calculator or contact the local clerk before filing. Do not treat any single county's fee as the statewide rate.",
    feesRecoverableCitation: undefined,

    statuteOfLimitations: [
      { label: "Written contract", period: "5 years" },
      { label: "Oral contract", period: "3 years" },
      { label: "Property damage", period: "5 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    statuteOfLimitationsCitation: "written contract Va. Code § 8.01-246(A)(2); oral contract Va. Code § 8.01-246(A)(4) (needs final verification); property damage Va. Code § 8.01-243(B); personal injury Va. Code § 8.01-243(A)",

    serviceDeadlineText: "at least 5 days before the hearing; if served by mail, at least 10 days before the return date (DC-413 required for mail service, if applicable)",
    serviceMethodsText: "Sheriff service (~$12 per defendant — verify exact fee before production) or certified mail per Va. Code § 17.1-272",
    serviceOfProcessCitation: "Va. Code § 17.1-272",

    forms: [
      { id: "DC-402", name: "Warrant in Debt", desc: "The main form you file to start your case in the Small Claims Division of General District Court." },
      { id: "DC-409", name: "Petition to Proceed In Forma Pauperis (Fee Waiver)", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: true,
    collectionToolsText: "garnishment (wages/bank), writ of fieri facias (property execution), judgment lien — GDC judgments entered on or after 1985 are valid for 10 years (Va. Code § 16.1-94.1)",

    appealNote: "Appeals to Circuit Court must generally be filed within 10 days of judgment; the case is heard fresh (\"trial de novo\") in Circuit Court.",
  },

  NJ: {
    code: "NJ",
    name: "New Jersey",
    flagEmoji: "🌊",
    courtSystemName: "Special Civil Part, Small Claims Section",
    courtBranchName: "New Jersey Courts",
    selfHelpUrl: "https://www.njcourts.gov/self-help/small-claims-court",
    selfHelpLabel: "NJ Courts Small Claims Self-Help",
    countyLabel: "New Jersey County",
    pickerSubText: "Up to $5,000",

    claimLimitText: "$5,000 (the general Special Civil Part limit is $20,000, but the Small Claims Section is capped at $5,000)",
    claimLimitCitation: "N.J. Ct. R. 6:1-1, 6:1-2 (effective July 1, 2022)",

    hearingOfficialTitle: "judge",

    attorneysAllowed: true,
    attorneysNote: "Attorneys are allowed but most individuals file and present small claims cases without one. Whether an LLC/corporation may appear without a licensed attorney is NEEDS VERIFICATION (research did not confirm this against N.J. Ct. R. 1:21-1) — do not tell a business user they can self-represent until this is verified",

    filingFeeTiers: [
      { label: "to sue one defendant", fee: "$35" },
      { label: "each additional defendant", fee: "$5" },
    ],
    filingFeeNote: "Plus service fees: roughly $10 per defendant for certified/regular mail service; the court mails the summons for you after filing",
    feesRecoverableCitation: undefined,

    statuteOfLimitations: [
      { label: "Written contract", period: "6 years" },
      { label: "Oral contract", period: "6 years" },
      { label: "Property damage", period: "6 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    statuteOfLimitationsCitation: "N.J.S.A. 2A:14-1 (contracts/property — NEEDS VERIFICATION of current statutory text); N.J.S.A. 2A:14-2 (personal injury)",

    serviceDeadlineText: "at least 5 days before the hearing (and no more than 30 days after the date of service); process must be mailed within 12 days of filing",
    serviceMethodsText: "The court mails the summons and complaint to the defendant by certified and regular mail after you file; a Special Civil Part Officer can also serve personally for an additional fee",
    serviceOfProcessCitation: "N.J. Ct. R. 6:2-1",

    forms: [
      { id: "", name: "Small Claims Complaint", desc: "States the parties, the amount claimed, and why the defendant owes you money." },
      { id: "Appendix XI-A(2)", name: "Small Claims Summons and Return of Service", desc: "Summons and proof-of-service form used in the Small Claims Section." },
      { id: "", name: "Fee Waiver (Application to Proceed as an Indigent)", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 20,
    judgmentRenewable: true,
    collectionToolsText: "wage garnishment, bank levy, and a judgment lien on real property docketed with the Superior Court Clerk — a NJ judgment is valid for 20 years and may be revived for an additional 20-year term via motion (N.J.S.A. 2A:14-5)",

    appealNote: "Appeals from a Small Claims Section judgment must generally be filed within 45 days of the date of judgment.",

    filingFrequencyCapText: undefined,
  },

  WA: {
    code: "WA",
    name: "Washington",
    flagEmoji: "🏔️",
    courtSystemName: "District Court, Small Claims Department",
    courtBranchName: "Washington Courts",
    selfHelpUrl: "https://www.courts.wa.gov/newsinfo/resources/index.cfm?fa=newsinfo_resources.smallclaims",
    selfHelpLabel: "Washington Courts Small Claims Resources",
    countyLabel: "Washington County",
    pickerSubText: "Up to $10,000",

    claimLimitText: "$10,000 for individuals; $5,000 for businesses, assignees, and collection agencies",
    claimLimitCitation: "RCW 12.40.010",

    hearingOfficialTitle: "judge",

    attorneysAllowed: false,
    attorneysNote: "Attorneys are generally NOT allowed to represent parties in Washington small claims court (RCW 12.40.080) — never suggest hiring one for the hearing. Whether a corporation must still appear through a non-attorney authorized representative is NEEDS VERIFICATION",

    filingFeeTiers: [
      { label: "base statutory fee", fee: "$35" },
      { label: "in counties with a Dispute Resolution Center surcharge", fee: "$50" },
    ],
    filingFeeNote: "The base fee is $35 statewide (RCW 12.40.020); most counties (including King, Pierce, Snohomish, and Thurston) add a Dispute Resolution Center surcharge (RCW 7.75.035) bringing the total to $50. Plus a sheriff/process-server service fee, typically $30–$50.",
    feesRecoverableCitation: undefined,

    statuteOfLimitations: [
      { label: "Written contract", period: "6 years" },
      { label: "Oral contract", period: "3 years" },
      { label: "Property damage", period: "3 years" },
      { label: "Personal injury", period: "3 years" },
    ],
    statuteOfLimitationsCitation: "RCW 4.16.040 (written contract); RCW 4.16.080 (oral contract, property damage, personal injury)",

    serviceDeadlineText: "at least 10 days before the hearing",
    serviceMethodsText: "Certified mail, sheriff, or a process server — the plaintiff arranges service, the court does not serve the defendant automatically",
    serviceOfProcessCitation: "RCW 12.40.030; CRLJ 5",

    forms: [
      { id: "", name: "Notice of Small Claim", desc: "The main form you file to start your case in Small Claims Department of District Court." },
      { id: "", name: "Small Claims Calendar Notice", desc: "Notifies the defendant of the hearing date and location." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: true,
    collectionToolsText: "wage garnishment, bank account garnishment, writ of execution, judgment lien on real property — a WA judgment is valid for 10 years and may be renewed for an additional 10 years",
    appealNote: "Appeals from a small claims judgment are generally filed in Superior Court — exact appeal deadline NEEDS VERIFICATION before being surfaced as a specific number to users",

    keyCounties: ["King (Seattle)", "Pierce (Tacoma)", "Snohomish (Everett)", "Spokane", "Clark (Vancouver)"],
  },

  AZ: {
    code: "AZ",
    name: "Arizona",
    flagEmoji: "🌵",
    courtSystemName: "Small Claims Division of the Justice Court",
    courtBranchName: "Arizona Judicial Branch",
    selfHelpUrl: "https://www.azcourts.gov/selfservicecenter/small-claims",
    selfHelpLabel: "Arizona Courts Small Claims Self-Help",
    countyLabel: "Arizona Justice Court Precinct",
    pickerSubText: "Up to $5,000",

    claimLimitText: "$5,000 for individuals and businesses alike (exclusive of interest and court costs)",
    claimLimitCitation: "A.R.S. § 22-503",

    hearingOfficialTitle: "justice of the peace",

    attorneysAllowed: false,
    attorneysNote: "Attorneys may NOT appear, prosecute, or defend a small claims case (A.R.S. § 22-512) unless all parties stipulate in writing before the hearing — businesses appear through an authorized officer or employee, not a lawyer. Never suggest hiring an attorney for an AZ small claims hearing",

    filingFeeTiers: [
      { label: "flat statewide fee", fee: "$30" },
    ],
    filingFeeCitation: "A.R.S. § 22-281",
    filingFeeNote: "plus $8 service-by-mail fee; constable, sheriff, or process server fees vary by county. Fee waiver form: AOCDFGF1F (Application for Deferral or Waiver of Court Fees or Costs)",

    statuteOfLimitations: [
      { label: "Written contract", period: "6 years" },
      { label: "Oral contract", period: "3 years" },
      { label: "Property damage", period: "2 years" },
      { label: "Personal injury", period: "2 years" },
    ],
    statuteOfLimitationsCitation: "written A.R.S. § 12-548; oral A.R.S. § 12-543; property damage and personal injury A.R.S. § 12-542",

    serviceDeadlineText: "proof of service must be filed with the court within 45 days after filing the complaint",
    serviceMethodsText: "Registered or certified mail with return receipt requested, constable, sheriff, or licensed private process server — the plaintiff arranges service; the court does NOT serve the defendant automatically",
    serviceOfProcessCitation: "A.R.S. § 22-513",

    forms: [
      { id: "", name: "Small Claims Complaint", desc: "The main form you file to start your case in the Small Claims Division of the Justice Court." },
      { id: "", name: "Small Claims Summons", desc: "Notifies the defendant of the lawsuit and the hearing date." },
      { id: "", name: "Proof of Service by Registered or Certified Mail", desc: "Required — file with the court within 45 days of filing your complaint to prove the defendant was served." },
      { id: "AOCDFGF1F", name: "Application for Deferral or Waiver of Court Fees or Costs", desc: "Apply to waive filing fees if you cannot afford them." },
    ],

    judgmentValidityYears: 10,
    judgmentRenewable: true,
    collectionToolsText: "wage garnishment, bank account levy/garnishment, writ of execution on personal property, judgment lien on real property (record certified copy with county recorder per A.R.S. § 33-961 — valid 10 years), and debtor's examination (A.R.S. § 22-524) — judgment is valid for 10 years and may be renewed for an additional 10-year term (A.R.S. § 12-1551, § 12-1611)",

    appealNote: "There is NO appeal from an Arizona small claims judgment — the decision of the justice of the peace or hearing officer is final and binding (A.R.S. § 22-519). Choose small claims carefully: if you lose, you cannot appeal.",

    keyCounties: ["Maricopa (Phoenix)", "Pima (Tucson)", "Pinal (Florence)", "Yavapai (Prescott)", "Mohave (Kingman)", "Coconino (Flagstaff)", "Yuma", "Navajo (Holbrook)"],
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

/** e.g. "under $100 → $55 | $101–$500 → $80 | $501–$2,500 → $175 | over $2,500 → $300" */
export function formatFilingFeeTiersArrow(facts: StateFacts): string {
  return facts.filingFeeTiers.map((t) => `${t.label} → ${t.fee}`).join(" | ");
}

/** e.g. "$30–$75" — low-high range across all filing fee tiers */
export function formatFilingFeeRange(facts: StateFacts): string {
  const fees = facts.filingFeeTiers.map((t) => t.fee);
  return `${fees[0]}–${fees[fees.length - 1]}`;
}

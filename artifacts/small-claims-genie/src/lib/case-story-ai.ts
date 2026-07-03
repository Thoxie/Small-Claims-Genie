// Case Story Builder — Intake Step 2 guided intake
//
// This module isolates all AI-related calls for the Step 2 "case story builder" so the
// UI component never talks to the backend directly. Two of the three functions below are
// wired to real, existing backend endpoints (`/advisor/analyze` and `/advisor/refine`)
// because those endpoints are already built for draft review / case-statement generation.
// `getMissingFactsWithAI` has no matching backend endpoint yet — it is a clearly-labeled
// placeholder that returns local, structural checks only in development, and returns an
// empty result in production so nothing resembling real AI analysis is shown to real users.

export interface GuidedQuestion {
  id: string;
  question: string;
}

export interface CaseStoryReview {
  followUpQuestions: GuidedQuestion[];
  evidenceChecklist: { id: string; item: string; description: string; checked?: boolean }[];
  truncatedDocs: string[];
  legalAlert: string;
}

export interface CaseStoryDraftResult {
  generatedDraft: string;
}

const UNIVERSAL_QUESTIONS: GuidedQuestion[] = [
  { id: "u1", question: "Who is the defendant?" },
  { id: "u2", question: "What did the defendant agree to do, pay, return, repair, provide, or stop doing?" },
  { id: "u3", question: "What date did the issue happen?" },
  { id: "u4", question: "How much money are you asking for?" },
  { id: "u5", question: "How did you calculate that amount?" },
  { id: "u6", question: "What proof do you have?" },
  { id: "u7", question: "Did you try to resolve the issue before filing?" },
  { id: "u8", question: "What response did the defendant give?" },
  { id: "u9", question: "What outcome are you asking the court to order?" },
];

const CLAIM_TYPE_QUESTIONS: Record<string, GuidedQuestion[]> = {
  "Money Owed": [
    { id: "mo1", question: "What was the money for?" },
    { id: "mo2", question: "Was it a loan, unpaid invoice, unpaid work, reimbursement, rent, deposit, or something else?" },
    { id: "mo3", question: "When was payment due?" },
    { id: "mo4", question: "Was there a written agreement, text, invoice, email, or verbal promise?" },
    { id: "mo5", question: "Did the defendant make any partial payments?" },
    { id: "mo6", question: "Did you send a demand for payment?" },
    { id: "mo7", question: "What proof shows the defendant owes this money?" },
  ],
  "Unpaid Debt": [
    { id: "mo1", question: "What was the money for?" },
    { id: "mo2", question: "Was it a loan, unpaid invoice, unpaid work, reimbursement, rent, deposit, or something else?" },
    { id: "mo3", question: "When was payment due?" },
    { id: "mo4", question: "Was there a written agreement, text, invoice, email, or verbal promise?" },
    { id: "mo5", question: "Did the defendant make any partial payments?" },
    { id: "mo6", question: "Did you send a demand for payment?" },
    { id: "mo7", question: "What proof shows the defendant owes this money?" },
  ],
  "Property Damage": [
    { id: "pd1", question: "What property was damaged?" },
    { id: "pd2", question: "Who owned the property?" },
    { id: "pd3", question: "How did the defendant cause the damage?" },
    { id: "pd4", question: "When did the damage happen?" },
    { id: "pd5", question: "Do you have photos from before and after?" },
    { id: "pd6", question: "Do you have repair estimates, receipts, or replacement costs?" },
    { id: "pd7", question: "Has insurance paid anything?" },
    { id: "pd8", question: "Are you asking for repair cost, replacement cost, loss of use, or something else?" },
  ],
  "Vehicle Repair / Auto Dispute": [
    { id: "vr1", question: "What vehicle was involved?" },
    { id: "vr2", question: "What problem did you bring the vehicle in for?" },
    { id: "vr3", question: "What did the shop promise to diagnose, repair, replace, or fix?" },
    { id: "vr4", question: "Did you approve an estimate?" },
    { id: "vr5", question: "How much did you pay?" },
    { id: "vr6", question: "What happened after the repair?" },
    { id: "vr7", question: "Did the same problem continue, or was there a new problem?" },
    { id: "vr8", question: "Did you return to the shop and give them a chance to fix it?" },
    { id: "vr9", question: "Did they refuse to fix it or refuse to refund you?" },
    { id: "vr10", question: "Do you have an invoice, estimate, diagnostic report, photos, video, witness, or second mechanic opinion?" },
  ],
  "Security Deposit": [
    { id: "sd1", question: "What was the rental address?" },
    { id: "sd2", question: "How much was the deposit?" },
    { id: "sd3", question: "When did you move in?" },
    { id: "sd4", question: "When did you move out?" },
    { id: "sd5", question: "Did you provide a forwarding address?" },
    { id: "sd6", question: "Did the landlord send an itemized deduction statement?" },
    { id: "sd7", question: "When did they send it?" },
    { id: "sd8", question: "What deductions do you dispute?" },
    { id: "sd9", question: "Do you have move-in photos, move-out photos, texts, emails, lease documents, or receipts?" },
    { id: "sd10", question: "How much of the deposit are you asking to recover?" },
  ],
  "Contract Dispute": [
    { id: "cd1", question: "What service or product did you pay for?" },
    { id: "cd2", question: "What exactly did the defendant promise?" },
    { id: "cd3", question: "Was there a written contract, invoice, estimate, receipt, email, or text agreement?" },
    { id: "cd4", question: "What did the defendant actually do?" },
    { id: "cd5", question: "What did the defendant fail to do?" },
    { id: "cd6", question: "Did you ask them to fix, complete, cancel, or refund the work?" },
    { id: "cd7", question: "Did you hire someone else to fix or complete the work?" },
    { id: "cd8", question: "How did you calculate the amount you are requesting?" },
  ],
  "Landlord/Tenant": [
    { id: "lt1", question: "Are you the tenant or landlord?" },
    { id: "lt2", question: "What rental property is involved?" },
    { id: "lt3", question: "What lease term, rental obligation, repair obligation, or notice issue is involved?" },
    { id: "lt4", question: "What did the other party do or fail to do?" },
    { id: "lt5", question: "What notices were given?" },
    { id: "lt6", question: "What dates are important?" },
    { id: "lt7", question: "What money are you asking for?" },
    { id: "lt8", question: "Do you have a lease, rent ledger, notices, photos, texts, emails, invoices, or inspection reports?" },
  ],
  Fraud: [
    { id: "ot1", question: "What type of dispute is this?" },
    { id: "ot2", question: "What did the defendant do wrong?" },
    { id: "ot3", question: "What agreement, duty, promise, or legal obligation did the defendant violate?" },
    { id: "ot4", question: "What money did you lose?" },
    { id: "ot5", question: "How did you calculate the amount?" },
    { id: "ot6", question: "What evidence supports your claim?" },
    { id: "ot7", question: "What did you do to try to resolve the issue before filing?" },
  ],
  Other: [
    { id: "ot1", question: "What type of dispute is this?" },
    { id: "ot2", question: "What did the defendant do wrong?" },
    { id: "ot3", question: "What agreement, duty, promise, or legal obligation did the defendant violate?" },
    { id: "ot4", question: "What money did you lose?" },
    { id: "ot5", question: "How did you calculate the amount?" },
    { id: "ot6", question: "What evidence supports your claim?" },
    { id: "ot7", question: "What did you do to try to resolve the issue before filing?" },
  ],
};

/** Returns the full guided question list (universal + claim-type-specific) for a given claim type. */
export function getGuidedQuestions(claimType: string): GuidedQuestion[] {
  const specific = CLAIM_TYPE_QUESTIONS[claimType] || CLAIM_TYPE_QUESTIONS.Other;
  return [...UNIVERSAL_QUESTIONS, ...specific];
}

interface AuthedFetchOpts {
  caseId: number;
  getToken: () => Promise<string | null>;
}

/**
 * Reviews the user's existing "What happened?" draft using the real Case Advisor
 * backend (`/advisor/analyze`). Returns follow-up questions and a legal alert for
 * preview — the caller must NOT write these into the user's draft automatically.
 */
export async function reviewDraftWithAI(
  values: Record<string, unknown>,
  { caseId, getToken }: AuthedFetchOpts
): Promise<CaseStoryReview> {
  const token = await getToken();
  const res = await fetch(`/api/cases/${caseId}/advisor/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Review failed");
  const data = await res.json();
  return {
    followUpQuestions: Array.isArray(data.questions) ? data.questions : [],
    evidenceChecklist: Array.isArray(data.evidenceChecklist) ? data.evidenceChecklist : [],
    truncatedDocs: Array.isArray(data.truncatedDocs) ? data.truncatedDocs : [],
    legalAlert: typeof data.legalAlert === "string" ? data.legalAlert : "",
  };
}

/**
 * Generates a suggested court-friendly case statement from guided question answers
 * (or from a draft + advisor follow-up answers) using the real backend
 * (`/advisor/refine`). Returns the draft for preview only — never auto-applied.
 */
export async function generateCaseStatementWithAI(
  values: Record<string, unknown>,
  answers: { question: string; answer: string }[],
  { caseId, getToken }: AuthedFetchOpts
): Promise<CaseStoryDraftResult> {
  const token = await getToken();
  const res = await fetch(`/api/cases/${caseId}/advisor/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ ...values, answers }),
  });
  if (!res.ok) throw new Error("Generate failed");
  const data = await res.json();
  return { generatedDraft: typeof data.refinedStatement === "string" ? data.refinedStatement.trim() : "" };
}

/**
 * TODO: No backend endpoint currently returns a structured "missing facts" checklist
 * distinct from the evidence checklist / follow-up questions already produced by
 * `/advisor/analyze`. This placeholder does not call any AI model.
 *
 * In development only, it returns a small set of clearly-labeled mock checklist items
 * so the UI shell can be exercised end-to-end. In production it returns an empty list
 * so nothing resembling real AI analysis is ever shown to real users.
 *
 * Wire this to a real backend endpoint (e.g. `POST /api/cases/:id/advisor/missing-facts`)
 * once one exists.
 */
export async function getMissingFactsWithAI(
  userDescription: string,
  _claimType: string,
  _guidedAnswers: Record<string, string>
): Promise<string[]> {
  if (import.meta.env.PROD) return [];
  const desc = userDescription.trim();
  const mock: string[] = [];
  if (!/\$\s?\d/.test(desc)) mock.push("[DEV MOCK] You did not clearly state a dollar amount in your description.");
  if (desc.length < 200) mock.push("[DEV MOCK] Your description may be missing detail about dates or evidence.");
  return mock;
}

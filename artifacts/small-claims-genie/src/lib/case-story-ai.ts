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
  hint?: string;
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

/**
 * Short, claim-type-aware "starter" questions asked instantly (no AI call) before handing
 * off to the real Case Advisor for claim-specific follow-ups. Each claim type gets its own
 * set of 4 questions phrased for that situation, with a hint under each guiding how much
 * detail to give. Deliberately excludes anything already captured elsewhere in intake
 * (defendant name, incident date, claim amount) to avoid asking the user the same thing twice.
 */
const STARTER_QUESTIONS_BY_CLAIM_TYPE: Record<string, GuidedQuestion[]> = {
  "Money Owed": [
    { id: "s1", question: "How much money is owed to you, and what was it for?", hint: "E.g. a personal loan, an unpaid invoice, a bounced check — be specific about what the money was for." },
    { id: "s2", question: "What proof do you have that the money is owed?", hint: "E.g. an IOU, an invoice, texts where they agreed to pay, bank or Venmo/Zelle records. List each item you have." },
    { id: "s3", question: "Did you ask the defendant to pay before filing? How and when?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s4", question: "What did they say or do in response?", hint: "E.g. promised to pay but didn't, disputed the debt, or ignored you entirely." },
  ],
  "Unpaid Debt": [
    { id: "s1", question: "How much money is owed to you, and what was it for?", hint: "E.g. a personal loan, an unpaid invoice, a bounced check — be specific about what the money was for." },
    { id: "s2", question: "What proof do you have that the money is owed?", hint: "E.g. an IOU, an invoice, texts where they agreed to pay, bank or Venmo/Zelle records. List each item you have." },
    { id: "s3", question: "Did you ask the defendant to pay before filing? How and when?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s4", question: "What did they say or do in response?", hint: "E.g. promised to pay but didn't, disputed the debt, or ignored you entirely." },
  ],
  "Security Deposit": [
    { id: "s1", question: "How much was your deposit, when did you move out, and how long ago was that?", hint: "California law requires landlords to return your deposit or send an itemized statement of deductions within 21 days of move-out." },
    { id: "s2", question: "What proof do you have?", hint: "E.g. your lease, move-in/move-out photos or video, the landlord's itemized deduction letter (if you got one)." },
    { id: "s3", question: "Did you send a written request for your deposit back? What did you say?", hint: "Describe when you asked and how (text, email, letter)." },
    { id: "s4", question: "Did the landlord respond — did they return part of it, send a deduction list, or not respond at all?", hint: "Note any amount they did return and what reasons (if any) they gave for keeping the rest." },
  ],
  "Property Damage": [
    { id: "s1", question: "What property was damaged, and how did the defendant cause the damage?", hint: "Describe the item or property and exactly what the defendant did to damage it." },
    { id: "s2", question: "What proof do you have?", hint: "E.g. photos or video of the damage, repair estimates or receipts, a police report." },
    { id: "s3", question: "Did you ask the defendant to pay for repairs before filing?", hint: "Describe how and when you asked." },
    { id: "s4", question: "What was their response?", hint: "E.g. they refused, offered less than the repair cost, or ignored you." },
  ],
  "Contract Dispute": [
    { id: "s1", question: "What did the agreement say the defendant would do, and what did they fail to do?", hint: "Describe the terms of the agreement (written or verbal) and exactly where they fell short." },
    { id: "s2", question: "What proof do you have of the agreement?", hint: "E.g. a signed contract, texts, emails, or invoices referencing the agreed terms." },
    { id: "s3", question: "Did you try to resolve the breach before filing?", hint: "Describe how and when you raised the issue with them." },
    { id: "s4", question: "How did the defendant respond?", hint: "E.g. they admitted fault, offered a partial fix, or denied any wrongdoing." },
  ],
  Fraud: [
    { id: "s1", question: "What false statement or promise did the defendant make, and how did you rely on it?", hint: "Describe exactly what they told you and what you did (e.g. paid money, signed something) because you believed them." },
    { id: "s2", question: "What proof do you have?", hint: "E.g. messages, ads or listings, contracts, payment records showing what you were told and what you paid." },
    { id: "s3", question: "Did you confront the defendant about it before filing?", hint: "Describe how and when you raised the issue." },
    { id: "s4", question: "How did they respond?", hint: "E.g. denied it, offered a partial refund, or stopped responding." },
  ],
  Other: [
    { id: "s1", question: "What did the defendant agree to do, pay, return, repair, provide, or stop doing?", hint: "Be as specific as you can — include the amount, date, or service involved if you remember it." },
    { id: "s2", question: "What proof do you have (documents, photos, texts, receipts, etc.)?", hint: "List each item you have — you don't need to upload anything here if you already did in the Documents step." },
    { id: "s3", question: "Did you try to resolve this before filing? What did you do?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s4", question: "What response (if any) did the defendant give you?", hint: "Quote or paraphrase what they said, or note if they ignored you." },
  ],
};

/** Returns the claim-type-aware starter question set shown instantly, before the AI advisor generates claim-specific follow-ups. Falls back to the generic "Other" set for unrecognized or missing claim types. */
export function getStarterQuestions(claimType?: string): GuidedQuestion[] {
  return STARTER_QUESTIONS_BY_CLAIM_TYPE[claimType || ""] || STARTER_QUESTIONS_BY_CLAIM_TYPE.Other;
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

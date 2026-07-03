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
 * Facts already captured earlier in intake (Step 1: the parties, court/county/state,
 * business vs. individual status) or already on the Step 2 form itself (claim amount).
 * The guided flow uses these to personalize question wording (e.g. using the defendant's
 * actual name) instead of ever asking the user to re-enter them.
 */
export interface KnownCaseFacts {
  defendantName?: string;
  plaintiffName?: string;
  jurisdictionState?: string;
  defendantIsBusiness?: boolean;
}

/** Builds a `{defendant}` display label from Step 1 data — the actual name if known, otherwise a neutral fallback. Never asked for again in Step 2. */
function defendantLabel(facts?: KnownCaseFacts): string {
  const name = facts?.defendantName?.trim();
  return name || (facts?.defendantIsBusiness ? "the defendant business" : "the defendant");
}

function fillTemplate(text: string, facts?: KnownCaseFacts): string {
  return text.replace(/\{defendant\}/g, defendantLabel(facts));
}

/**
 * Claim-type-aware "starter" questions asked instantly (no AI call) before handing off to
 * the real Case Advisor for claim-specific follow-ups. Each claim type gets a baseline set
 * of ~9 fact-finding questions covering: what happened, what was promised/agreed, what went
 * wrong, the amount and how it was calculated, evidence, timeline, pre-filing resolution
 * attempts, and the defendant's response — with `{defendant}` templated to the real name
 * from Step 1 when known. Deliberately excludes anything already captured elsewhere in
 * intake (party names/addresses, court/county/state, business status, claim amount) so the
 * user is never asked the same thing twice.
 */
const STARTER_QUESTIONS_BY_CLAIM_TYPE: Record<string, GuidedQuestion[]> = {
  "Money Owed": [
    { id: "s1", question: "How much money does {defendant} owe you, and what was it for?", hint: "E.g. a personal loan, an unpaid invoice, a bounced check — be specific about what the money was for." },
    { id: "s2", question: "What was agreed about repayment?", hint: "E.g. a due date, installment plan, verbal promise, or written terms." },
    { id: "s3", question: "When did the money first become due, and how long has it been unpaid?", hint: "This helps show the claim is timely and unresolved." },
    { id: "s4", question: "How did you arrive at the exact amount you're claiming?", hint: "E.g. the loan amount minus any partial payments, or the invoice total plus any agreed fees." },
    { id: "s5", question: "What proof do you have that the money is owed?", hint: "E.g. an IOU, an invoice, texts where they agreed to pay, bank or Venmo/Zelle records. List each item you have." },
    { id: "s6", question: "Did you ask {defendant} to pay before filing? How and when?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s7", question: "What did they say or do in response?", hint: "E.g. promised to pay but didn't, disputed the debt, or ignored you entirely." },
    { id: "s8", question: "Has any partial payment been made?", hint: "Note the amount and date of any partial payment, so it can be subtracted from your claim." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  "Unpaid Debt": [
    { id: "s1", question: "How much money does {defendant} owe you, and what was it for?", hint: "E.g. a personal loan, an unpaid invoice, a bounced check — be specific about what the money was for." },
    { id: "s2", question: "What was agreed about repayment?", hint: "E.g. a due date, installment plan, verbal promise, or written terms." },
    { id: "s3", question: "When did the money first become due, and how long has it been unpaid?", hint: "This helps show the claim is timely and unresolved." },
    { id: "s4", question: "How did you arrive at the exact amount you're claiming?", hint: "E.g. the loan amount minus any partial payments, or the invoice total plus any agreed fees." },
    { id: "s5", question: "What proof do you have that the money is owed?", hint: "E.g. an IOU, an invoice, texts where they agreed to pay, bank or Venmo/Zelle records. List each item you have." },
    { id: "s6", question: "Did you ask {defendant} to pay before filing? How and when?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s7", question: "What did they say or do in response?", hint: "E.g. promised to pay but didn't, disputed the debt, or ignored you entirely." },
    { id: "s8", question: "Has any partial payment been made?", hint: "Note the amount and date of any partial payment, so it can be subtracted from your claim." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  "Security Deposit": [
    { id: "s1", question: "How much was your security deposit, and when did you move out?", hint: "Give the deposit amount and the exact move-out date." },
    { id: "s2", question: "What did your lease say about getting your deposit back?", hint: "E.g. any deadline or deduction rules stated in the lease, if you remember them." },
    { id: "s3", question: "How long has it been since you moved out without your deposit (or an itemized deduction list)?", hint: "Most states require landlords to return a deposit or send an itemized list of deductions within a set number of days after move-out — check your state's specific deadline if unsure." },
    { id: "s4", question: "What condition was the unit in when you left?", hint: "Describe cleanliness, any normal wear and tear vs. damage, and whether you did a move-out walkthrough." },
    { id: "s5", question: "What proof do you have?", hint: "E.g. your lease, move-in/move-out photos or video, the landlord's itemized deduction letter (if you got one)." },
    { id: "s6", question: "Did you send a written request for your deposit back? What did you say?", hint: "Describe when you asked and how (text, email, letter)." },
    { id: "s7", question: "Did the landlord respond — did they return part of it, send a deduction list, or not respond at all?", hint: "Note any amount they did return and what reasons (if any) they gave for keeping the rest." },
    { id: "s8", question: "If deductions were claimed, do you dispute them? Why?", hint: "E.g. charges for pre-existing damage, normal wear and tear, or costs with no receipts." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  "Property Damage": [
    { id: "s1", question: "What property was damaged, and how did {defendant} cause the damage?", hint: "Describe the item or property and exactly what the defendant did to damage it." },
    { id: "s2", question: "When and where did the damage happen?", hint: "Give the date and location as precisely as you can." },
    { id: "s3", question: "What was the property worth or what did it cost to repair/replace?", hint: "Note the value before the damage, and the cost to fix or replace it." },
    { id: "s4", question: "How did you arrive at the exact amount you're claiming?", hint: "E.g. a repair estimate, replacement cost, or the actual amount you paid to fix it." },
    { id: "s5", question: "What proof do you have?", hint: "E.g. photos or video of the damage, repair estimates or receipts, a police report." },
    { id: "s6", question: "Did you ask {defendant} to pay for repairs before filing?", hint: "Describe how and when you asked." },
    { id: "s7", question: "What was their response?", hint: "E.g. they refused, offered less than the repair cost, or ignored you." },
    { id: "s8", question: "Did anyone witness the damage happen?", hint: "Note any witnesses and whether they'd be willing to confirm what they saw." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  "Contract Dispute": [
    { id: "s1", question: "What did the agreement say {defendant} would do, and what did they fail to do?", hint: "Describe the terms of the agreement (written or verbal) and exactly where they fell short." },
    { id: "s2", question: "When was the agreement made, and when was it supposed to be completed?", hint: "Give dates as precisely as you can." },
    { id: "s3", question: "What did you do on your end to hold up your side of the agreement?", hint: "E.g. paid a deposit, provided materials, showed up as agreed." },
    { id: "s4", question: "How did you arrive at the exact amount you're claiming?", hint: "E.g. money paid but not refunded, cost to hire someone else to finish the job, or lost value." },
    { id: "s5", question: "What proof do you have of the agreement?", hint: "E.g. a signed contract, texts, emails, or invoices referencing the agreed terms." },
    { id: "s6", question: "Did you try to resolve the breach before filing?", hint: "Describe how and when you raised the issue with them." },
    { id: "s7", question: "How did {defendant} respond?", hint: "E.g. they admitted fault, offered a partial fix, or denied any wrongdoing." },
    { id: "s8", question: "Did you have to pay someone else or spend extra money because of the breach?", hint: "E.g. hiring a replacement contractor, paying a rush fee, or other added cost." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  Fraud: [
    { id: "s1", question: "What false statement or promise did {defendant} make, and how did you rely on it?", hint: "Describe exactly what they told you and what you did (e.g. paid money, signed something) because you believed them." },
    { id: "s2", question: "When did this happen, and how did you find out it was false?", hint: "Give the date of the statement and the date you discovered the truth." },
    { id: "s3", question: "How did you arrive at the exact amount you're claiming?", hint: "E.g. the amount you paid based on the false statement, minus anything you got back." },
    { id: "s4", question: "What proof do you have?", hint: "E.g. messages, ads or listings, contracts, payment records showing what you were told and what you paid." },
    { id: "s5", question: "Did anyone else witness or hear the false statement?", hint: "Note any witnesses who could confirm what was said." },
    { id: "s6", question: "Did you confront {defendant} about it before filing?", hint: "Describe how and when you raised the issue." },
    { id: "s7", question: "How did they respond?", hint: "E.g. denied it, offered a partial refund, or stopped responding." },
    { id: "s8", question: "Have you gotten any money back so far?", hint: "Note any partial refund and when it happened, so it can be subtracted from your claim." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
  Other: [
    { id: "s1", question: "What did {defendant} agree to do, pay, return, repair, provide, or stop doing?", hint: "Be as specific as you can — include the amount, date, or service involved if you remember it." },
    { id: "s2", question: "What actually happened instead?", hint: "Describe exactly what went wrong or what {defendant} did or failed to do." },
    { id: "s3", question: "When did this happen?", hint: "Give the date, or date range, as precisely as you can." },
    { id: "s4", question: "How did you arrive at the exact amount you're claiming?", hint: "Explain how you calculated the dollar amount you're asking for." },
    { id: "s5", question: "What proof do you have (documents, photos, texts, receipts, etc.)?", hint: "List each item you have — you don't need to upload anything here if you already did in the Documents step." },
    { id: "s6", question: "Did you try to resolve this before filing? What did you do?", hint: "Describe how you reached out (call, text, email, letter) and roughly when." },
    { id: "s7", question: "What response (if any) did {defendant} give you?", hint: "Quote or paraphrase what they said, or note if they ignored you." },
    { id: "s8", question: "Did anyone witness what happened?", hint: "Note any witnesses and whether they'd be willing to confirm what they saw." },
    { id: "s9", question: "Is there anything else the judge should know?", hint: "Any other detail that helps explain the situation." },
  ],
};

/**
 * Returns the claim-type-aware starter question set shown instantly, before the AI advisor
 * generates claim-specific follow-ups. Falls back to the generic "Other" set for
 * unrecognized or missing claim types. Question text is personalized with known Step 1
 * facts (e.g. the defendant's real name) via `facts` rather than re-asking for them.
 */
export function getStarterQuestions(claimType?: string, facts?: KnownCaseFacts): GuidedQuestion[] {
  const bank = STARTER_QUESTIONS_BY_CLAIM_TYPE[claimType || ""] || STARTER_QUESTIONS_BY_CLAIM_TYPE.Other;
  return bank.map(q => ({ ...q, question: fillTemplate(q.question, facts) }));
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

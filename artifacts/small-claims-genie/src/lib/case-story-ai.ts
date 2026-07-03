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

/**
 * Short, universal "starter" questions asked instantly (no AI call) before handing off
 * to the real Case Advisor for claim-specific follow-ups. Deliberately excludes anything
 * already captured elsewhere in intake (defendant name, incident date, claim amount) to
 * avoid asking the user the same thing twice.
 */
const STARTER_QUESTIONS: GuidedQuestion[] = [
  { id: "s1", question: "What did the defendant agree to do, pay, return, repair, provide, or stop doing?" },
  { id: "s2", question: "What proof do you have (documents, photos, texts, receipts, etc.)?" },
  { id: "s3", question: "Did you try to resolve this before filing? What did you do?" },
  { id: "s4", question: "What response (if any) did the defendant give you?" },
];

/** Returns the short static starter question set shown instantly, before the AI advisor generates claim-specific follow-ups. */
export function getStarterQuestions(): GuidedQuestion[] {
  return STARTER_QUESTIONS;
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

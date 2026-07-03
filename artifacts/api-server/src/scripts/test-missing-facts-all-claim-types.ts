/**
 * End-to-end verification: missing-facts check for every guided-flow claim type
 *
 * Run with:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/test-missing-facts-all-claim-types.ts
 *
 * What this tests:
 *   - Calls the REAL `computeMissingFacts` function (exported from routes/cases.ts) —
 *     the exact same brief-building + prompt + OpenAI call used by
 *     POST /api/cases/:id/advisor/missing-facts — for all 11 claim types the guided
 *     flow supports (7 original + 4 added in Task #431).
 *   - Bypasses Clerk/HTTP entirely by calling the function directly with an in-memory
 *     case record, since programmatic Clerk sign-in is blocked in this environment.
 *   - For each claim type: submits an intentionally SPARSE draft description (no dollar
 *     amount, no dates, no evidence, no prior demand) and asserts the AI flags at least
 *     one missing fact.
 *   - Also runs one COMPLETE case (all facts covered in the case record + description)
 *     as a negative control, expecting zero or near-zero missing facts, to confirm the
 *     check isn't just flagging everything indiscriminately.
 */

/* eslint-disable no-console -- standalone diagnostic script run manually via tsx, not a server route */
import { computeMissingFacts } from "../routes/cases";
import type { casesTable, documentsTable } from "@workspace/db";

type CaseRow = typeof casesTable.$inferSelect;
type DocRow = typeof documentsTable.$inferSelect;

const CLAIM_TYPES = [
  "Money Owed",
  "Unpaid Debt",
  "Security Deposit",
  "Property Damage",
  "Contract Dispute",
  "Fraud",
  "Vehicle Damage/Accident",
  "Landlord/Tenant Dispute",
  "Online Purchase/Marketplace Dispute",
  "Unpaid Wages/Employment",
  "Other",
] as const;

function baseCase(overrides: Partial<CaseRow>): CaseRow {
  const now = new Date();
  return {
    id: 0,
    userId: "test-missing-facts-script",
    title: "[TEST] Missing Facts Verification",
    status: "draft",
    countyId: "ca-los-angeles",
    claimAmount: null,
    claimType: null,
    plaintiffName: "Jordan Rivera",
    plaintiffPhone: "(555) 010-0001",
    plaintiffAddress: "123 Test Lane",
    plaintiffCity: "Los Angeles",
    plaintiffState: "CA",
    plaintiffZip: "90001",
    plaintiffEmail: "test-plaintiff@example.com",
    plaintiffMailingAddress: null,
    plaintiffMailingCity: null,
    plaintiffMailingState: null,
    plaintiffMailingZip: null,
    plaintiffIsBusiness: false,
    plaintiffIsFictitious: false,
    plaintiffDbaName: null,
    plaintiffDbaAddress: null,
    plaintiffDbaCity: null,
    plaintiffDbaState: null,
    plaintiffDbaZip: null,
    plaintiffDbaMailingAddress: null,
    plaintiffBusinessType: null,
    plaintiffBusinessTypeOther: null,
    plaintiffFbnNumber: null,
    plaintiffFbnExpiry: null,
    plaintiffFbnSignDate: null,
    plaintiffFbnCounty: null,
    plaintiffTitle: null,
    secondPlaintiffName: null,
    secondPlaintiffPhone: null,
    secondPlaintiffAddress: null,
    secondPlaintiffCity: null,
    secondPlaintiffState: null,
    secondPlaintiffZip: null,
    secondPlaintiffEmail: null,
    secondPlaintiffMailingAddress: null,
    secondPlaintiffMailingCity: null,
    secondPlaintiffMailingState: null,
    secondPlaintiffMailingZip: null,
    hasAdditionalPlaintiff: false,
    additionalPlaintiffName: null,
    additionalPlaintiffIsFictitious: false,
    secondPlaintiffDbaName: null,
    secondPlaintiffDbaAddress: null,
    secondPlaintiffDbaCity: null,
    secondPlaintiffDbaState: null,
    secondPlaintiffDbaZip: null,
    secondPlaintiffDbaMailingAddress: null,
    secondPlaintiffBusinessType: null,
    secondPlaintiffBusinessTypeOther: null,
    secondPlaintiffFbnNumber: null,
    secondPlaintiffFbnExpiry: null,
    secondPlaintiffFbnSignDate: null,
    secondPlaintiffFbnCounty: null,
    secondPlaintiffTitle: null,
    moreThanFourPlaintiffs: false,
    moreThanTwoDefendants: false,
    defendantName: "Sam Defendant",
    defendantPhone: null,
    defendantAddress: "456 Other St",
    defendantCity: "Los Angeles",
    defendantState: "CA",
    defendantZip: "90002",
    defendantMailingAddress: null,
    defendantMailingCity: null,
    defendantMailingState: null,
    defendantMailingZip: null,
    defendantIsBusinessOrEntity: false,
    defendantAgentName: null,
    defendantAgentTitle: null,
    defendantAgentStreet: null,
    defendantAgentCity: null,
    defendantAgentState: null,
    defendantAgentZip: null,
    claimDescription: null,
    incidentDate: null,
    howAmountCalculated: null,
    priorDemandMade: null,
    priorDemandDate: null,
    priorDemandMethod: null,
    priorDemandDescription: null,
    priorDemandWhyNot: null,
    venueReason: null,
    venueBasis: null,
    courthouseId: null,
    courthouseName: null,
    courthouseAddress: null,
    courthouseCity: null,
    courthouseZip: null,
    courthousePhone: null,
    courthouseWebsite: null,
    courthouseClerkEmail: null,
    filingFee: null,
    isSuingPublicEntity: false,
    publicEntityClaimFiledDate: null,
    isAttyFeeDispute: false,
    hadArbitration: false,
    filedMoreThan12Claims: false,
    claimOver2500: false,
    jurisdictionState: "CA",
    intakeStep: 2,
    intakeComplete: false,
    documentCount: 0,
    readinessScore: 20,
    demandLetterText: null,
    demandLetterTone: null,
    demandLetterTextFormal: null,
    demandLetterTextFirm: null,
    demandLetterTextFriendly: null,
    settlementLetterText: null,
    settlementLetterTone: null,
    settlementAgreementText: null,
    evidenceChecklist: null,
    guidedIntakeData: null,
    caseNumber: null,
    hearingDate: null,
    hearingTime: null,
    hearingJudge: null,
    hearingCourtroom: null,
    hearingNotes: null,
    mc030DeclarationTitle: null,
    mc030DeclarationText: null,
    mc030ExhibitDocIds: null,
    sc104Data: null,
    notifyMethod: null,
    statementText: null,
    noShowStatementText: null,
    efilingEligible: null,
    efilingStatus: null,
    efilingEnvelopeId: null,
    reminder30DaySent: false,
    reminder14DaySent: false,
    reminder7DaySent: false,
    reminder3DaySent: false,
    reminder1DaySent: false,
    reminderNoHearingDateSent: false,
    confirmationEmailSent: false,
    weeklyReminderLastSent: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as CaseRow;
}

const NO_DOCS: DocRow[] = [];

// A deliberately vague, fact-poor description — no amount, no dates, no evidence, no
// prior demand — for every claim type. This should trigger multiple missing-fact flags
// regardless of claim type.
const SPARSE_DESCRIPTION = "The defendant did something wrong and I want my money back.";

async function testSparse(claimType: string): Promise<{ claimType: string; missingFacts: string[]; pass: boolean }> {
  const caseRecord = baseCase({ claimType, claimDescription: SPARSE_DESCRIPTION });
  const missingFacts = await computeMissingFacts(caseRecord, NO_DOCS, {
    description: SPARSE_DESCRIPTION,
    claimType,
  });
  return { claimType, missingFacts, pass: missingFacts.length > 0 };
}

async function testCompleteControl(): Promise<{ missingFacts: string[]; pass: boolean }> {
  const claimType = "Money Owed";
  const description =
    "On March 3, 2026, I loaned Sam Defendant $2,500 in cash to help cover a medical bill, with a written promise (signed IOU) " +
    "that they would repay me in full by April 3, 2026. They have not repaid any of it. I texted them on April 5, April 20, and " +
    "May 10, 2026 asking for repayment; they replied on April 20 saying they would pay 'soon' but never did. I have the signed IOU, " +
    "our text message thread showing the repayment promise and my follow-up requests, and a bank withdrawal receipt showing I " +
    "withdrew $2,500 in cash on March 3, 2026. The $2,500 I am claiming is exactly the amount I loaned them, with no interest added.";
  const caseRecord = baseCase({
    claimType,
    claimDescription: description,
    claimAmount: 2500,
    incidentDate: "2026-03-03",
    howAmountCalculated: "Exact amount loaned in cash, no interest added.",
    priorDemandMade: true,
    priorDemandDate: "2026-04-05",
    priorDemandMethod: "Text message",
    priorDemandDescription: "Texted on April 5, April 20, and May 10, 2026 asking for repayment; they promised to pay on April 20 but never did.",
  });
  const missingFacts = await computeMissingFacts(caseRecord, NO_DOCS, { description, claimType });
  return { missingFacts, pass: missingFacts.length <= 1 };
}

async function main() {
  console.log(`Testing missing-facts check for ${CLAIM_TYPES.length} claim types...\n`);

  const results: { claimType: string; missingFacts: string[]; pass: boolean }[] = [];
  for (const claimType of CLAIM_TYPES) {
    const result = await testSparse(claimType);
    results.push(result);
    console.log(`[${result.pass ? "PASS" : "FAIL"}] ${claimType} — ${result.missingFacts.length} flag(s)`);
    for (const f of result.missingFacts) console.log(`         - ${f}`);
  }

  console.log("\nTesting negative control (complete case should NOT be flagged heavily)...");
  const control = await testCompleteControl();
  console.log(`[${control.pass ? "PASS" : "FAIL"}] Complete "Money Owed" case — ${control.missingFacts.length} flag(s)`);
  for (const f of control.missingFacts) console.log(`         - ${f}`);

  const failures = results.filter((r) => !r.pass);
  console.log("\n" + "=".repeat(60));
  console.log(`Sparse-case checks: ${results.length - failures.length}/${results.length} passed`);
  console.log(`Negative control: ${control.pass ? "passed" : "FAILED"}`);
  if (failures.length > 0) {
    console.log(`\nFAILED claim types (no missing facts flagged despite a sparse draft):`);
    for (const f of failures) console.log(`  - ${f.claimType}`);
  }
  console.log("=".repeat(60));

  if (failures.length > 0 || !control.pass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});

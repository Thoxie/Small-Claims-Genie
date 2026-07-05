import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/clerk-react";
import { useGetCaseReadiness } from "@workspace/api-client-react";
import type { ExtendedCase, DocumentWithMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Info, Loader2, PenLine, RotateCcw, FileText, FileCheck, CheckCircle2, AlertTriangle, Paperclip, Sparkles, Package, Eye, Play, X, ChevronRight, Maximize2, ExternalLink, UserCheck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { DraftModeBanner } from "@/components/draft-overlay";
import { sc104FieldsToBody } from "./sc104-utils";
import { FormWizardStepper } from "@/components/form-wizard-stepper";

// ─── TX JP Precinct 1 Place 1 lookup (top 30 counties by population) ─────────
const TX_JP_PRECINCTS: Record<string, { address: string; city: string; zip: string }> = {
  "tx-harris":     { address: "1310 Prairie St",          city: "Houston",        zip: "77002" },
  "tx-dallas":     { address: "600 Commerce St",           city: "Dallas",         zip: "75202" },
  "tx-tarrant":    { address: "200 Taylor St",             city: "Fort Worth",     zip: "76196" },
  "tx-bexar":      { address: "100 Dolorosa St",           city: "San Antonio",    zip: "78205" },
  "tx-travis":     { address: "5501 Airport Blvd",         city: "Austin",         zip: "78751" },
  "tx-collin":     { address: "2100 Bloomdale Rd",         city: "McKinney",       zip: "75071" },
  "tx-hidalgo":    { address: "2812 S Bus 281",            city: "Edinburg",       zip: "78539" },
  "tx-el-paso":    { address: "500 E San Antonio Ave",     city: "El Paso",        zip: "79901" },
  "tx-denton":     { address: "1450 E McKinney St",        city: "Denton",         zip: "76209" },
  "tx-fort-bend":  { address: "1422 Eugene Heimann Cir",   city: "Richmond",       zip: "77469" },
  "tx-montgomery": { address: "210 W Davis St",            city: "Conroe",         zip: "77301" },
  "tx-williamson": { address: "405 MLK St",                city: "Georgetown",     zip: "78626" },
  "tx-cameron":    { address: "974 E Harrison St",         city: "Brownsville",    zip: "78520" },
  "tx-nueces":     { address: "901 Leopard St",            city: "Corpus Christi", zip: "78401" },
  "tx-galveston":  { address: "722 Moody Ave",             city: "Galveston",      zip: "77550" },
  "tx-bell":       { address: "550 E 2nd Ave",             city: "Belton",         zip: "76513" },
  "tx-webb":       { address: "1110 Victoria St",          city: "Laredo",         zip: "78040" },
  "tx-hays":       { address: "712 S Stagecoach Trail",    city: "San Marcos",     zip: "78666" },
  "tx-lubbock":    { address: "904 Broadway St",           city: "Lubbock",        zip: "79401" },
  "tx-jefferson":  { address: "1149 Pearl St",             city: "Beaumont",       zip: "77701" },
  "tx-brazoria":   { address: "111 E Locust St",           city: "Angleton",       zip: "77515" },
  "tx-smith":      { address: "100 N Broadway Ave",        city: "Tyler",          zip: "75702" },
  "tx-mclennan":   { address: "501 Washington Ave",        city: "Waco",           zip: "76701" },
  "tx-brazos":     { address: "300 E 26th St",             city: "Bryan",          zip: "77803" },
  "tx-comal":      { address: "150 N Seguin Ave",          city: "New Braunfels",  zip: "78130" },
  "tx-guadalupe":  { address: "211 W Court St",            city: "Seguin",         zip: "78155" },
  "tx-parker":     { address: "1112 Santa Fe Dr",          city: "Weatherford",    zip: "76086" },
  "tx-grayson":    { address: "100 W Houston St",          city: "Sherman",        zip: "75090" },
  "tx-gregg":      { address: "101 E Methvin St",          city: "Longview",       zip: "75601" },
  "tx-ector":      { address: "300 N Grant Ave",           city: "Odessa",         zip: "79761" },
};

// ─── Multi-state wizard step definitions ─────────────────────────────────
  const FL_WIZARD_STEPS = [
    { id: "fl-claim",      number: "Claim",      shortLabel: "Statement of Claim",  status: "required" as const },
    { id: "fl-summons",    number: "Summons",    shortLabel: "Summons / Notice",    status: "required" as const },
    { id: "fl-service",    number: "Service",    shortLabel: "Serve Defendant",     status: "required" as const },
    { id: "fl-fee-waiver", number: "Fee Waiver", shortLabel: "Fee Waiver",          status: "optional" as const },
  ];
  const TX_WIZARD_STEPS = [
    { id: "tx-petition",   number: "Petition",   shortLabel: "TX Petition",         status: "required" as const },
    { id: "tx-citation",   number: "Citation",   shortLabel: "Citation",            status: "required" as const },
    { id: "tx-service",    number: "Service",    shortLabel: "Serve Defendant",     status: "required" as const },
    { id: "tx-fee-waiver", number: "Fee Waiver", shortLabel: "Fee Waiver",          status: "optional" as const },
  ];
  const IL_WIZARD_STEPS = [
    { id: "il-complaint",  number: "Complaint",  shortLabel: "SMC Complaint",       status: "required" as const },
    { id: "il-summons",    number: "Summons",    shortLabel: "IL Summons",          status: "required" as const },
    { id: "il-service",    number: "Service",    shortLabel: "Serve Defendant",     status: "required" as const },
    { id: "il-fee-waiver", number: "Fee Waiver", shortLabel: "Fee Waiver",          status: "optional" as const },
  ];
  const NC_WIZARD_STEPS = [
    { id: "nc-complaint",  number: "Complaint",  shortLabel: "AOC-CVM-200",         status: "required" as const },
    { id: "nc-summons",    number: "Summons",    shortLabel: "AOC-CVM-100",         status: "required" as const },
    { id: "nc-service",    number: "Service",    shortLabel: "Sheriff Service",     status: "required" as const },
    { id: "nc-fee-waiver", number: "Fee Waiver", shortLabel: "AOC-G-106",           status: "optional" as const },
  ];
  const VA_WIZARD_STEPS = [
    { id: "va-warrant",    number: "Warrant",    shortLabel: "DC-402",              status: "required" as const },
    { id: "va-service",    number: "Service",    shortLabel: "Sheriff Service",     status: "required" as const },
    { id: "va-fee-waiver", number: "Fee Waiver", shortLabel: "DC-409",              status: "optional" as const },
  ];

  // ─── Forms Catalog ────────────────────────────────────────────────────────────
const FORMS_CATALOG = [
  // ── 1. Primary filing form ────────────────────────────────────────────────
  { id: "sc100",  number: "SC-100",  name: "Plaintiff's Claim and ORDER to Go to Small Claims Court", shortDesc: "Primary filing form.", detailDesc: "SC-100 is the form that starts your California small claims case. It tells the court who you are suing, how much money you want, and why you are asking the court to order payment.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc100.pdf", caseTypes: "both" as const },
  // ── 2. Fictitious business name — filed separately alongside SC-100 when suing a DBA ──────
  { id: "sc103",  number: "SC-103",  name: "Fictitious Business Name", shortDesc: "Required when a party is suing or being sued under a 'doing business as' (DBA) name.", detailDesc: "SC-103 must be filed as a separate form alongside SC-100 or SC-120 whenever a plaintiff or defendant operates under a fictitious business name. Submit it to the clerk at the same time as your main filing.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc103.pdf", caseTypes: "business" as const },
  // ── 2b. Fictitious business name — Plaintiff 2 (additional plaintiff) ──────
  { id: "sc103b", number: "SC-103", name: "Fictitious Business Name — Plaintiff 2", shortDesc: "Required for the additional plaintiff who operates under a DBA name.", detailDesc: "SC-103 must be filed separately for each plaintiff operating under a fictitious business name. The additional plaintiff files their own SC-103 alongside SC-100 or SC-100A.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc103.pdf", caseTypes: "business" as const },
  // ── 3. Proof of Service — personal service ────────────────────────────────
  { id: "sc104",  number: "SC-104",  name: "Proof of Service", shortDesc: "Documents that the defendant was properly served with the court papers.", detailDesc: "SC-104 is completed by the person who delivered (served) the court papers to the defendant — this must be someone who is at least 18 years old and not named in the case.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc104.pdf", caseTypes: "both" as const },
  // ── 4. Proof of Service — mail service (complement to SC-104) ────────────
  { id: "sc112a", number: "SC-112A", name: "Proof of Service by Mail", shortDesc: "Proves that certain court documents were properly served by mailing them.", detailDesc: "SC-112A is used when specific forms are allowed to be served by mail rather than in person.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc112a.pdf", caseTypes: "both" as const },
  // ── 5. Additional parties — when more than two plaintiffs or defendants ───
  { id: "sc100a", number: "SC-100A", name: "Other Plaintiffs or Defendants", shortDesc: "Filed separately alongside SC-100 when your case has more than two plaintiffs or defendants.", detailDesc: "SC-100A is a supplemental form filed separately alongside SC-100 when there are more than two parties on either side of the case. Submit it to the clerk at the same time as your SC-100.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc100a.pdf", caseTypes: "both" as const },
  // ── 6. Declaration — sworn statement when form space is insufficient ──────
  { id: "mc030",  number: "MC-030",  name: "Declaration", shortDesc: "A general sworn statement form for information that doesn't fit on the main form.", detailDesc: "MC-030 is a blank declaration form used across many types of California court cases, including small claims. It is used whenever a party needs to submit a written statement under penalty of perjury that doesn't fit within the space provided on a specific form.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/mc030.pdf", caseTypes: "both" as const },
  // ── 7. Fee waiver — file before or with SC-100 if you can't afford fees ──
  { id: "fw001",  number: "FW-001",  name: "Request to Waive Court Fees", shortDesc: "Ask the court to waive your filing fees if paying would be a financial hardship.", detailDesc: "FW-001 lets you ask the court to waive court filing fees when you cannot afford them. You may qualify if you receive public benefits, your income is below the threshold, or paying the fee would prevent you from meeting your household's basic needs.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/fw001.pdf", caseTypes: "both" as const },
  // ── 8. Court order request ────────────────────────────────────────────────
  { id: "sc105",  number: "SC-105",  name: "Request for Court Order and Answer", shortDesc: "Ask the court to issue a specific order before or after your trial.", detailDesc: "SC-105 is a two-part form for requesting court orders — for example, requesting more time, asking to amend the claim, or requesting a payment plan after judgment.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc105.pdf", caseTypes: "both" as const },
  // ── 9. Postpone trial ─────────────────────────────────────────────────────
  { id: "sc150",  number: "SC-150",  name: "Request to Postpone Trial", shortDesc: "Ask the court to reschedule your hearing to a later date.", detailDesc: "SC-150 lets either a plaintiff or defendant formally request that the court move the trial to a different date.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc150.pdf", caseTypes: "both" as const },
  // ── 10. Defendant counter-claim ───────────────────────────────────────────
  { id: "sc120",  number: "SC-120",  name: "Defendant's Claim and ORDER to Go to Small Claims Court", shortDesc: "Used by the defendant to file a counter-claim against the original plaintiff.", detailDesc: "SC-120 allows the defendant to file their own claim against the plaintiff in the same case.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc120.pdf", caseTypes: "both" as const },
  // ── 11. Appeal ────────────────────────────────────────────────────────────
  { id: "sc140",  number: "SC-140",  name: "Notice of Appeal", shortDesc: "File this to appeal a small claims judgment to the superior court.", detailDesc: "SC-140 is used when a party disagrees with the small claims court's decision and wants to appeal it to the superior court.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc140.pdf", caseTypes: "both" as const },
];

const FORM_GUIDE_CONTENT: Record<string, { role: "primary"|"attachment"; effectiveDate: string; bestUse: string; whenToUse: string[]; whenNotToUse: string[]; haveReady: string[]; warnings: string[]; relatedForms: { number: string; reason: string }[] }> = {
  sc100: { role: "primary", effectiveDate: "January 1, 2026", bestUse: "Use this to open your California small claims case — fill it out completely and file it with the court clerk to get your hearing date.", whenToUse: ["You are a California resident or are suing someone in California who owes you money.", "Your claim is within the small claims dollar limit for your situation."], whenNotToUse: ["Your claim exceeds the small claims limit — file in a higher court instead.", "You are a business suing another business for more than $5,000."], haveReady: ["Your full legal name, address, and phone number.", "The defendant's full name and current address.", "The exact dollar amount you are claiming.", "A clear, factual statement of why the defendant owes you money."], warnings: ["Make sure you have the defendant's correct address — incorrect service can delay or dismiss your case.", "The $12,500 limit applies to most individuals; businesses are capped at $6,250.", "File your MC-030 Declaration with the clerk at the same time — it is always included with your California filing and strengthens your evidence packet."], relatedForms: [{ number: "MC-030", reason: "Always included — sworn declaration strengthens your evidence packet" }, { number: "SC-100A", reason: "If you have more than two parties" }, { number: "FW-001", reason: "To waive filing fees if you qualify" }] },
  mc030: { role: "primary", effectiveDate: "January 1, 2006", bestUse: "Use this to submit a complete sworn declaration of the facts supporting your claim — included with every California small claims filing to build the strongest possible evidence packet.", whenToUse: ["You are filing a California small claims case — MC-030 is included with every case as a standard sworn declaration.", "You want to present a detailed, organized statement of facts under penalty of perjury.", "You have exhibits (photos, contracts, receipts) to attach to your declaration."], whenNotToUse: ["You are trying to substitute a declaration for the correct main filing form — SC-100 is still required.", "Your declaration contains opinions or arguments rather than facts from your personal knowledge."], haveReady: ["A clear heading describing what your declaration covers.", "The facts of your case stated from your own personal knowledge.", "Any exhibits you want to attach (photos, receipts, contracts, texts).", "Your signature under penalty of perjury and the date signed."], warnings: ["Keep facts separate from opinions — state only what you personally observed or experienced.", "Be clear and concise — judges read many declarations and reward organized, fact-focused writing."], relatedForms: [{ number: "MC-031", reason: "If more attachment pages are needed" }, { number: "SC-100", reason: "Main claim form — file together with MC-030" }] },
  sc104: { role: "primary", effectiveDate: "January 1, 2009", bestUse: "Use this after a non-party adult personally serves the filed small claims papers.", whenToUse: ["A non-party adult (age 18+) personally handed the filed papers to the defendant.", "You need to show the court who served, when, and how."], whenNotToUse: ["You are proving mail service — a different form may be needed.", "You are trying to serve papers yourself — the plaintiff cannot serve their own papers."], haveReady: ["Server's full name, age, and address.", "The date, time, and place of service.", "The identity of the person who received the papers."], warnings: ["Service is a technical step — if done wrong, the hearing can be delayed or dismissed.", "The plaintiff cannot personally serve their own papers."], relatedForms: [{ number: "SC-112A", reason: "When later papers are served by mail instead" }] },
  fw001: { role: "primary", effectiveDate: "March 1, 2026", bestUse: "Use this before or at the time of filing SC-100 if you cannot afford the court filing fee without financial hardship.", whenToUse: ["You receive public benefits: Medi-Cal, CalWORKS, SSI/SSP, Food Stamps (CalFresh), IHSS, etc.", "Your gross monthly household income is below the threshold for your family size.", "You do not have enough income to pay for basic household needs and court fees."], whenNotToUse: ["You can afford the filing fee without financial hardship.", "Your case settled for $10,000 or more."], haveReady: ["Proof of public benefits if claiming eligibility.", "Monthly income figures for all household members.", "Monthly expense amounts and information about assets."], warnings: ["This form is confidential — the court will not give it to the other party.", "If your financial situation improves, you are required to notify the court.", "False statements on a fee waiver form are a criminal offense."], relatedForms: [{ number: "SC-100", reason: "File together with your claim" }, { number: "FW-001-INFO", reason: "Information sheet explaining eligibility rules" }] },
  sc100a: { role: "attachment", effectiveDate: "January 1, 2026", bestUse: "File separately alongside SC-100 when there are more than two parties on either side of your case. Submit it to the clerk at the same time as your SC-100 — it is a separate form, not combined with SC-100.", whenToUse: ["You are suing three or more people or businesses.", "Three or more people are bringing the claim together."], whenNotToUse: ["You only have two parties total — SC-100 alone is sufficient."], haveReady: ["Full names and contact information for all additional parties.", "Each additional plaintiff must also sign."], warnings: ["Each additional plaintiff must sign and declare the information is true.", "SC-100A is a separate document — do not staple or merge it with SC-100. Hand both to the clerk separately."], relatedForms: [] },
  sc103: { role: "attachment", effectiveDate: "January 1, 2026", bestUse: "File separately alongside SC-100 or SC-120 when a party is suing or being identified through a DBA name. Submit it to the clerk at the same time as your main filing — it is a separate form.", whenToUse: ["A sole proprietor or business uses a 'doing business as' (DBA) name.", "You want the court record to connect the brand name with the legal owner."], whenNotToUse: ["The business is already named by its full legal entity name."], haveReady: ["The exact fictitious business name as registered.", "County fictitious business name filing records."], warnings: ["A DBA is not a separate legal person.", "Collecting a judgment is much easier when the legal identity is correct from the start.", "SC-103 is a separate document — do not staple or merge it with SC-100. Hand both to the clerk separately."], relatedForms: [] },
  sc103b: { role: "attachment", effectiveDate: "January 1, 2026", bestUse: "File separately alongside SC-100 or SC-100A when the additional plaintiff also operates under a DBA name. Submit it to the clerk at the same time as your main filing.", whenToUse: ["The additional (secondary) plaintiff uses a 'doing business as' (DBA) name.", "You want the court record to connect the brand name with the additional plaintiff's legal identity."], whenNotToUse: ["The additional plaintiff is already named by their full legal name with no DBA."], haveReady: ["The exact fictitious business name as registered.", "County fictitious business name filing records.", "The additional plaintiff's legal name and title/role."], warnings: ["Each plaintiff who uses a DBA must file their own separate SC-103 — they cannot share one.", "SC-103 (Plaintiff 2) is a separate document — do not staple or merge it with SC-100 or SC-100A. Hand all forms to the clerk separately."], relatedForms: [] },
  sc105: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this to ask the judge to rule on a specific procedural issue before or after trial.", whenToUse: ["You need a court order connected to the small claims case.", "The other side already filed SC-105 and you need to respond."], whenNotToUse: ["You are simply asking to move the hearing date — SC-150 is more specific for that."], haveReady: ["The exact order you want the judge to make.", "A concise, facts-first explanation of why the order is needed."], warnings: ["This is not a general narrative form. Keep it focused on a specific request."], relatedForms: [{ number: "SC-150", reason: "To postpone the trial date instead" }, { number: "MC-030", reason: "If a longer sworn explanation is needed" }] },
  sc112a: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this to prove that later small claims papers were served by mail — required after filing.", whenToUse: ["The specific rules allow mail service for the document.", "A non-party adult completed the mailing and can sign under penalty of perjury."], whenNotToUse: ["You are proving personal service of the original claim — use SC-104 for that."], haveReady: ["The name and address of the person who mailed the papers.", "The date and place of mailing.", "A list of the exact documents that were mailed."], warnings: [], relatedForms: [] },
  sc120: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this only if you have been sued and want to file your own claim against the plaintiff.", whenToUse: ["You were served with SC-100 and believe the plaintiff owes you money.", "Your claim fits within small claims court limits."], whenNotToUse: ["You are starting a brand-new case — use SC-100 instead.", "You just want to deny the plaintiff's allegations without asking for money."], haveReady: ["The existing case information and scheduled court date.", "The amount you claim the plaintiff owes you."], warnings: ["Timing is tighter here — if served more than 10 days before trial, your claim must be served on the plaintiff at least 5 days before trial.", "This form is optional."], relatedForms: [{ number: "SC-104", reason: "To prove you served the defendant claim" }] },
  sc140: { role: "primary", effectiveDate: "January 1, 2007", bestUse: "Use this after a judgment if you were ordered to pay and want to request a new hearing in superior court.", whenToUse: ["The court entered a small claims judgment against you and you disagree.", "You are still within the 30-day appeal deadline."], whenNotToUse: ["You were the original plaintiff and simply lost your claim.", "You missed the hearing and want another chance — that requires a motion to vacate."], haveReady: ["The judgment date and the date the notice of entry of judgment was served.", "The filing fee or a completed fee waiver request (FW-001)."], warnings: ["A small claims appeal leads to a completely new hearing.", "The 30-day deadline is strict."], relatedForms: [{ number: "SC-130", reason: "Notice of Entry of Judgment" }, { number: "FW-001", reason: "Fee waiver if cost of filing is a hardship" }] },
  sc150: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this when the current trial date genuinely will not work and you can clearly explain why.", whenToUse: ["You have a legitimate conflict or emergency.", "You are asking before the hearing date — ideally at least 10 days in advance."], whenNotToUse: ["You are simply not ready because you waited too long.", "You want to delay for tactical reasons."], haveReady: ["The current scheduled hearing date.", "A specific, honest explanation of why you need more time.", "Supporting documentation where possible."], warnings: ["A postponement request is not automatically granted.", "There is typically a fee to request a postponement."], relatedForms: [{ number: "SC-112A", reason: "Prove the request was served by mail" }] },
};

// ─── Form Assistant Field Config ──────────────────────────────────────────────
type FieldDef = { key: string; label: string; type: "text" | "textarea" | "select" | "date"; options?: { value: string; label: string }[]; placeholder?: string; required?: boolean; hint?: string };
type FieldGroup = { title: string; fields: FieldDef[] };
const FORM_FIELD_CONFIG: Record<string, { title: string; subtitle: string; endpoint: string; filename: (id: number) => string; groups: FieldGroup[] }> = {
  fw001: { title: "Request to Waive Court Fees (FW-001)", subtitle: "Answer a few questions about your income and household.", endpoint: "fw001", filename: (id) => `FW001-Case-${id}.pdf`, groups: [
    { title: "Eligibility Basis (Item 5)", fields: [
      { key: "eligibilityBasis", label: "Why are you requesting a fee waiver?", type: "select", required: true, options: [{ value: "5a", label: "I receive public benefits (Medi-Cal, CalWORKS, SSI, CalFresh, IHSS, etc.)" }, { value: "5b", label: "My gross monthly income is below the threshold for my household size" }, { value: "5c", label: "I don't have enough income to cover basic needs and court fees" }], hint: "Check form FW-001-INFO for the exact income thresholds." },
      { key: "familySize", label: "Number of people in your household (including yourself)", type: "text", placeholder: "e.g. 2" },
      { key: "grossMonthlyIncome", label: "Your gross monthly income (before taxes)", type: "text", placeholder: "e.g. 2400.00" },
    ]},
    { title: "Public Benefits (if Item 5a applies)", fields: [{ key: "benefits", label: "Which benefits do you receive?", type: "textarea", placeholder: "e.g. Medi-Cal, CalFresh (Food Stamps), SSI" }]},
    { title: "Monthly Expenses (required for Item 5c)", fields: [
      { key: "monthlyRent", label: "Rent or mortgage payment", type: "text", placeholder: "e.g. 1200.00" },
      { key: "monthlyFood", label: "Food and household supplies", type: "text", placeholder: "e.g. 400.00" },
      { key: "monthlyUtilities", label: "Utilities and telephone", type: "text", placeholder: "e.g. 150.00" },
      { key: "monthlyTransportation", label: "Transportation and auto expenses", type: "text", placeholder: "e.g. 200.00" },
      { key: "monthlyMedical", label: "Medical and dental expenses", type: "text", placeholder: "e.g. 100.00" },
      { key: "monthlyOther", label: "Other significant monthly expenses", type: "textarea", placeholder: "e.g. Child care $500, installment payments $150" },
    ]},
    { title: "Signature", fields: [{ key: "signDate", label: "Date signed", type: "date" }]},
  ]},
  mc030: { title: "Declaration (MC-030)", subtitle: "Provide the title and content of your declaration.", endpoint: "mc030", filename: (id) => `MC030-Case-${id}.pdf`, groups: [
    { title: "Declaration Content", fields: [
      { key: "declarationTitle", label: "Declaration Title", type: "text", placeholder: "e.g. Declaration of Jane Doe in Support of Claim", hint: "Optional — leave blank to omit a title" },
      { key: "declarationText", label: "Declaration Text", type: "textarea", placeholder: "Write your sworn statement here. Begin with '1.' for numbered paragraphs...", required: true },
      { key: "signDate", label: "Date Signed", type: "date" },
    ]},
  ]},
  sc100a: { title: "Other Plaintiffs or Defendants (SC-100A)", subtitle: "Any additional plaintiff from intake is pre-filled automatically. Use this form to add an additional defendant if needed — leave blank to skip.", endpoint: "sc100a", filename: (id) => `SC100A-Case-${id}.pdf`, groups: [
    { title: "Additional Defendant (optional)", fields: [{ key: "d1_name", label: "Full Name / Business Name", type: "text" }, { key: "d1_phone", label: "Phone Number", type: "text" }, { key: "d1_street", label: "Street Address", type: "text" }, { key: "d1_city", label: "City", type: "text" }, { key: "d1_state", label: "State", type: "text", placeholder: "CA" }, { key: "d1_zip", label: "ZIP", type: "text" }, { key: "d1_agentName", label: "Agent for Service Name (if corporation/LLC)", type: "text" }]},
    { title: "Signature", fields: [{ key: "signDate", label: "Date Signed", type: "date" }]},
  ]},
  sc103: { title: "Fictitious Business Name (SC-103)", subtitle: "Your DBA information is pre-filled from intake. Edit any field if needed before downloading.", endpoint: "sc103", filename: (id) => `SC103-Case-${id}.pdf`, groups: [
    { title: "Filed With", fields: [{ key: "attachedTo", label: "Filed with", type: "select", required: true, options: [{ value: "sc100", label: "SC-100 (Plaintiff's Claim)" }, { value: "sc120", label: "SC-120 (Defendant's Claim)" }] }]},
    { title: "Business Information", fields: [{ key: "businessName", label: "Business Name (DBA)", type: "text", required: true }, { key: "businessAddress", label: "Business Address", type: "text", required: true }, { key: "mailingAddress", label: "Mailing Address (if different)", type: "text" }, { key: "businessType", label: "Business Type", type: "select", required: true, options: [{ value: "individual", label: "Individual" }, { value: "association", label: "Association" }, { value: "partnership", label: "Partnership" }, { value: "corporation", label: "Corporation" }, { value: "llc", label: "Limited Liability Company (LLC)" }, { value: "other", label: "Other" }] }, { key: "businessTypeOther", label: "If Other, specify", type: "text" }]},
    { title: "Fictitious Business Name Statement", fields: [{ key: "fbnCounty", label: "County where FBN Statement was filed", type: "text" }, { key: "fbnNumber", label: "FBN Statement Number", type: "text", required: true }, { key: "fbnExpiry", label: "Expiration Date", type: "date", required: true }, { key: "signerName", label: "Name of Signer", type: "text" }, { key: "signDate", label: "Date Signed", type: "date" }]},
  ]},
  sc104: { title: "Proof of Service (SC-104)", subtitle: "To be completed by the person who served the court papers — not you.", endpoint: "sc104", filename: (id) => `SC104-Case-${id}.pdf`, groups: [
    { title: "Hearing Information", fields: [{ key: "courtStreet", label: "Court Street Address", type: "text" }, { key: "hearingDate", label: "Hearing Date", type: "date" }, { key: "hearingTime", label: "Hearing Time", type: "text", placeholder: "e.g. 9:00 a.m." }, { key: "hearingDept", label: "Department", type: "text", placeholder: "e.g. 97" }]},
    { title: "Who Was Served (Item 1)", fields: [{ key: "personServedName", label: "Person served (if serving a person)", type: "text" }, { key: "businessName", label: "Business/entity served (if serving a business)", type: "text" }, { key: "authorizedPerson", label: "Person authorized to accept service", type: "text" }, { key: "authorizedTitle", label: "Their job title", type: "text" }]},
    { title: "Documents Served (Item 3)", fields: [{ key: "docsServed_sc100", label: "SC-100 (Plaintiff's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] }, { key: "docsServed_sc120", label: "SC-120 (Defendant's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] }, { key: "docsServedOther", label: "Other documents (describe)", type: "text" }]},
    { title: "How Service Was Made (Item 4)", fields: [
      { key: "serviceMethod", label: "Service method", type: "select", required: true, options: [{ value: "personal", label: "Personal Service (handed directly to person)" }, { value: "substituted", label: "Substituted Service (left with another adult)" }] },
      { key: "serviceDate", label: "Date of service", type: "date", required: true },
      { key: "serviceTime", label: "Time of service", type: "text", placeholder: "e.g. 2:30 p.m." },
      { key: "serviceAddress", label: "Address where served", type: "text" },
      { key: "serviceCity", label: "City", type: "text" },
      { key: "serviceState", label: "State", type: "text", placeholder: "CA" },
      { key: "serviceZip", label: "ZIP code", type: "text" },
      { key: "subPersonDesc", label: "Substituted service only — name/description of person who received papers", type: "text" },
      { key: "mailingDate", label: "Substituted service only — date envelope mailed", type: "date" },
      { key: "mailingFrom", label: "Substituted service only — city/state mailed from", type: "text" },
    ]},
    { title: "Server Information", fields: [
      { key: "serverName", label: "Server's full name", type: "text", required: true },
      { key: "serverPhone", label: "Server's phone number", type: "text" },
      { key: "serverAddress", label: "Server's street address", type: "text" },
      { key: "serverCity", label: "City", type: "text" },
      { key: "serverState", label: "State", type: "text", placeholder: "CA" },
      { key: "serverZip", label: "ZIP code", type: "text" },
      { key: "serverFee", label: "Fee for service (if any, numbers only)", type: "text" },
      { key: "signDate", label: "Date signed by server", type: "date" },
    ]},
  ]},
  sc112a: { title: "Proof of Service by Mail (SC-112A)", subtitle: "To be completed by the person who mailed the court papers — NOT by you.", endpoint: "sc112a", filename: (id) => `SC112A-Case-${id}.pdf`, groups: [
    { title: "Who Mailed the Papers (Item 1)", fields: [
      { key: "serverName", label: "Full name of the person who mailed the papers", type: "text", required: true, hint: "Must be someone other than you — must be at least 18 years old and not a party in the case." },
      { key: "serverPhone", label: "Phone number", type: "text" },
      { key: "serverAddress", label: "Street address", type: "text", required: true },
      { key: "serverCity", label: "City", type: "text" },
      { key: "serverState", label: "State", type: "text", placeholder: "CA" },
      { key: "serverZip", label: "ZIP code", type: "text" },
    ]},
    { title: "Document Served by Mail (Item 2)", fields: [
      { key: "documentServed", label: "Which document was mailed to the other side?", type: "select", required: true, options: [
        { value: "sc105", label: "SC-105 (Request for Court Order and Answer)" },
        { value: "sc109", label: "SC-109 (Order on Claim of Exemption)" },
        { value: "sc114", label: "SC-114 (Request to Pay Judgment in Installments)" },
        { value: "sc133", label: "SC-133 (Defendant's Request to Pay in Installments)" },
        { value: "sc150", label: "SC-150 (Request to Postpone Trial)" },
        { value: "sc221", label: "SC-221 (Plaintiff's Claim — Arbitration)" },
        { value: "other", label: "Other (describe below)" },
      ]},
      { key: "documentServedOther", label: "If Other, describe the document mailed", type: "text" },
    ]},
    { title: "Person(s) Served (Item 3)", fields: [
      { key: "party1Name", label: "Name of person #1 who was served", type: "text", required: true },
      { key: "party1Address", label: "Mailing address where papers were sent (person #1)", type: "text" },
      { key: "party2Name", label: "Name of person #2 (if applicable)", type: "text" },
      { key: "party2Address", label: "Mailing address (person #2)", type: "text" },
      { key: "party3Name", label: "Name of person #3 (if applicable)", type: "text" },
      { key: "party3Address", label: "Mailing address (person #3)", type: "text" },
    ]},
    { title: "Mailing Details", fields: [
      { key: "mailingDate", label: "Date the papers were mailed", type: "date", required: true },
      { key: "mailingCity", label: "City where the papers were mailed from (post office location)", type: "text", required: true },
      { key: "signDate", label: "Date this form is signed", type: "date" },
    ]},
  ]},
  sc150: { title: "Request to Postpone Trial (SC-150)", subtitle: "Your name, address, and hearing date are already filled in. Just answer the questions below.", endpoint: "sc150", filename: (id) => `SC150-Case-${id}.pdf`, groups: [
    { title: "Your Role (Item 1)", fields: [
      { key: "requestingPartyRole", label: "You are filing this as the", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
    ]},
    { title: "Postponement Request", fields: [
      { key: "postponeUntilDate", label: "Postpone until approximately (Item 3 — optional)", type: "date" },
      { key: "postponeReason", label: "Why are you asking to postpone? (Item 4)", type: "textarea", required: true, placeholder: "Explain why you need more time..." },
      { key: "withinTenDaysReason", label: "If your trial is within 10 days — why didn't you ask sooner? (Item 5, optional)", type: "textarea", placeholder: "Only fill this in if your trial is within the next 10 days..." },
    ]},
  ]},
  sc105: { title: "Request for Court Order and Answer (SC-105)", subtitle: "Your name, address, and the other party's info are already filled in. Just answer the two questions below.", endpoint: "sc105", filename: (id) => `SC105-Case-${id}.pdf`, groups: [
    { title: "Your Role (Item 1)", fields: [
      { key: "requestingPartyRole", label: "You are filing this as the", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
    ]},
    { title: "Additional Parties to Notify (Item 2 — optional)", fields: [
      { key: "notice2Name", label: "Additional party name (if any)", type: "text" },
      { key: "notice2Address", label: "Their address", type: "text" },
      { key: "notice3Name", label: "Third party name (if any)", type: "text" },
      { key: "notice3Address", label: "Their address", type: "text" },
    ]},
    { title: "Order Requested (Item 3)", fields: [{ key: "orderRequested", label: "What court order are you asking for?", type: "textarea", required: true, placeholder: "e.g. Continue the hearing date to allow additional time to gather evidence." }]},
    { title: "Reason (Item 4)", fields: [{ key: "orderReason", label: "Why are you asking for this order?", type: "textarea", required: true, placeholder: "Explain the facts that support your request..." }]},
  ]},
  sc120: { title: "Defendant's Claim and ORDER (SC-120)", subtitle: "File a counter-claim against the plaintiff. Review the pre-filled fields and add your claim details.", endpoint: "sc120", filename: (id) => `SC120-Case-${id}.pdf`, groups: [
    { title: "Your Counter-Claim (Item 3)", fields: [
      { key: "counterClaimAmount", label: "Amount you are claiming ($)", type: "text", required: true, placeholder: "e.g. 2500.00" },
      { key: "counterClaimDate", label: "Date the incident or breach occurred", type: "date" },
      { key: "counterClaimReason", label: "Why do you believe the plaintiff owes you this amount?", type: "textarea", required: true, placeholder: "Describe what happened and why you are owed this money..." },
      { key: "counterClaimHowCalculated", label: "How did you calculate this amount?", type: "textarea", placeholder: "e.g. Property damage $1,500 + out-of-pocket costs $300..." },
    ]},
    { title: "Form Questions", fields: [
      { key: "priorDemand", label: "Did you ask the plaintiff for payment before filing?", type: "select", required: true, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "attyFeeDispute", label: "Is this a dispute over attorney fees?", type: "select", required: true, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "suingPublicEntity", label: "Are you suing a government agency or public entity?", type: "select", required: true, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
      { key: "moreThan12", label: "Have you filed more than 12 small claims cases in California in the last 12 months?", type: "select", required: true, options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
    ]},
    { title: "Signature", fields: [{ key: "signDate", label: "Date signed", type: "date" }]},
  ]},
  sc140: { title: "Notice of Appeal (SC-140)", subtitle: "Appeal a small claims judgment to superior court. Review the pre-filled fields and complete the appeal details.", endpoint: "sc140", filename: (id) => `SC140-Case-${id}.pdf`, groups: [
    { title: "Court Information", fields: [{ key: "courtName", label: "Court name and address", type: "text" }]},
    { title: "Who Is Appealing", fields: [
      { key: "appellantName", label: "Your full name (appellant)", type: "text", required: true },
      { key: "appellantRole", label: "I am the", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] },
    ]},
    { title: "Appeal Details", fields: [
      { key: "appealType", label: "I am appealing from a", type: "select", required: true, options: [{ value: "judgment", label: "Judgment after hearing" }, { value: "motion_to_vacate", label: "Motion to vacate a default judgment" }] },
      { key: "appealFiledDate", label: "Date of the judgment or order being appealed", type: "date", required: true },
    ]},
    { title: "Signature", fields: [{ key: "signDate", label: "Date signed", type: "date" }]},
  ]},
};

// ─── Form Assistant Modal ──────────────────────────────────────────────────────
function FormAssistantModal({ formId, caseId, initialValues, onClose, onDownload, onAiGenerate, onAiDraftSC105 }: {
  formId: string; caseId: number; initialValues?: Record<string, string>;
  onClose: () => void;
  onDownload: (endpoint: string, filename: string, body: Record<string, unknown>) => void;
  onAiGenerate?: () => Promise<string | null>;
  onAiDraftSC105?: () => Promise<{ orderRequested: string; orderReason: string }>;
}) {
  const cfg = FORM_FIELD_CONFIG[formId];
  const storageKey = `form-draft-${caseId}-${formId}`;
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    let stored: Record<string, string> = {};
    try { stored = JSON.parse(localStorage.getItem(`form-draft-${caseId}-${formId}`) ?? "null") ?? {}; } catch { /* */ }
    // initialValues (pre-filled from case data) always win over stored values
    return { ...stored, ...(initialValues ?? {}) };
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(formData)); } catch { /* */ }
  }, [formData, storageKey]);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sc105AiGenerating, setSc105AiGenerating] = useState(false);
  const [sc105AiError, setSc105AiError] = useState<string | null>(null);

  if (!cfg) return null;

  // Dynamic prompts: only ask for fields that aren't already known from intake/case data.
  // Any field whose initialValue has a non-empty value is hidden; its value is still submitted
  // because formData was seeded from initialValues. Groups left with zero fields are hidden too.
  const visibleGroups = cfg.groups
    .map(g => ({ ...g, fields: g.fields.filter(f => !(initialValues?.[f.key] ?? "").toString().trim()) }))
    .filter(g => g.fields.length > 0);

  function set(key: string, value: string) { setFormData(prev => ({ ...prev, [key]: value })); }

  async function handleAiGenerate() {
    if (!onAiGenerate) return;
    setAiGenerating(true); setAiError(null);
    try {
      const text = await onAiGenerate();
      if (text) setFormData(prev => ({ ...prev, declarationText: text }));
    } catch { setAiError("AI generation failed — please try again."); }
    finally { setAiGenerating(false); }
  }

  async function handleAiDraftSC105() {
    if (!onAiDraftSC105) return;
    setSc105AiGenerating(true); setSc105AiError(null);
    try {
      const result = await onAiDraftSC105();
      if (result) {
        setFormData(prev => ({
          ...prev,
          ...(result.orderRequested ? { orderRequested: result.orderRequested } : {}),
          ...(result.orderReason    ? { orderReason:    result.orderReason    } : {}),
        }));
      }
    } catch { setSc105AiError("AI draft failed — please try again."); }
    finally { setSc105AiGenerating(false); }
  }

  function buildBody(): Record<string, unknown> {
    const d: Record<string, unknown> = { ...formData };
    if (formId === "sc100a") {
      // p1 (second plaintiff) is read directly from the case DB on the server.
      // Only pass extra parties that aren't in the DB.
      d.extraPlaintiff = formData.p2_name ? {
        name: formData.p2_name || "", phone: formData.p2_phone || "",
        street: formData.p2_street || "", city: formData.p2_city || "",
        state: formData.p2_state || "CA", zip: formData.p2_zip || "",
      } : null;
      d.extraDefendant = formData.d1_name ? {
        name: formData.d1_name || "", phone: formData.d1_phone || "",
        street: formData.d1_street || "", city: formData.d1_city || "",
        state: formData.d1_state || "CA", zip: formData.d1_zip || "",
        agentName: formData.d1_agentName || "",
      } : null;
    }
    if (formId === "sc104") {
      const docsServed: string[] = [];
      if (formData.docsServed_sc100 === "yes") docsServed.push("sc100");
      if (formData.docsServed_sc120 === "yes") docsServed.push("sc120");
      if (formData.docsServedOther) docsServed.push("other");
      d.docsServed = docsServed;
    }
    if (formId === "sc112a") {
      const parties: { name: string; address: string }[] = [];
      for (let i = 1; i <= 5; i++) {
        const name = formData[`party${i}Name`];
        if (name) parties.push({ name, address: formData[`party${i}Address`] || "" });
      }
      d.partiesServed = parties;
      for (let i = 1; i <= 5; i++) { delete d[`party${i}Name`]; delete d[`party${i}Address`]; }
    }
    if (formId === "sc105") {
      const parties: { name: string; address: string }[] = [];
      for (let i = 1; i <= 3; i++) {
        const name = formData[`notice${i}Name`];
        if (name) parties.push({ name, address: formData[`notice${i}Address`] || "" });
      }
      d.noticeParties = parties;
      for (let i = 1; i <= 3; i++) { delete d[`notice${i}Name`]; delete d[`notice${i}Address`]; }
    }
    return d;
  }

  function handleSubmit() {
    // Only validate fields that are still being prompted for — pre-filled fields are already known.
    const required = visibleGroups.flatMap(g => g.fields).filter(f => f.required);
    const missing = required.filter(f => !formData[f.key]?.trim());
    if (missing.length > 0) { setValidationMsg(`Please fill in: ${missing.map(f => f.label).join(", ")}`); return; }
    setValidationMsg(null);
    const body = buildBody();
    onDownload(cfg.endpoint, cfg.filename(caseId), body);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">{cfg.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {visibleGroups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">All required information is already on file. Click <span className="font-semibold">Generate PDF</span> to download.</p>
          )}
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0d6b5e] mb-3">{group.title}</h3>
              <div className="space-y-3">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-foreground block mb-1">
                      {field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                    {field.hint && <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{field.hint}</p>}
                    {field.type === "select" ? (
                      <select value={formData[field.key] ?? ""} onChange={e => set(field.key, e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent">
                        <option value="">— Select —</option>
                        {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : field.type === "textarea" ? (
                      <div className="relative">
                        <textarea value={formData[field.key] ?? ""} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent resize-none" rows={5} />
                        {field.key === "declarationText" && onAiGenerate && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <button onClick={handleAiGenerate} disabled={aiGenerating}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0d6b5e]/10 text-[#0d6b5e] hover:bg-[#0d6b5e]/20 transition-colors disabled:opacity-50">
                              {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              {aiGenerating ? "Writing declaration…" : "AI Draft Declaration"}
                            </button>
                            {aiError && <p className="text-xs text-rose-600">{aiError}</p>}
                          </div>
                        )}
                        {field.key === "orderRequested" && onAiDraftSC105 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <button onClick={handleAiDraftSC105} disabled={sc105AiGenerating}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0d6b5e]/10 text-[#0d6b5e] hover:bg-[#0d6b5e]/20 transition-colors disabled:opacity-50">
                              {sc105AiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                              {sc105AiGenerating ? "Drafting…" : "AI Draft Items 3 & 4"}
                            </button>
                            {sc105AiError && <p className="text-xs text-rose-600">{sc105AiError}</p>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input type={field.type === "date" ? "date" : "text"} value={formData[field.key] ?? ""} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {validationMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />{validationMsg}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0 bg-muted/20">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-[#0d6b5e] text-white text-sm font-semibold hover:bg-[#0d6b5e]/90 transition-colors flex items-center gap-2">
            <Download className="h-3.5 w-3.5" />Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Signature Pad Modal ──────────────────────────────────────────────────────
export function SignaturePadModal({ open, onClose, onSign, onSkipSign, formTitle = "SC-100", disclaimer }: { open: boolean; onClose: () => void; onSign: (dataUrl: string) => void; onSkipSign: () => void; formTitle?: string; disclaimer?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { if (open) { setHasDrawn(false); setTimeout(() => clearCanvas(), 50); } }, [open]);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) { const t = e.touches[0]; return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }; }
    const m = e as React.MouseEvent;
    return { x: (m.clientX - rect.left) * scaleX, y: (m.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); const canvas = canvasRef.current; if (!canvas) return; setIsDrawing(true); setHasDrawn(true); lastPos.current = getPos(e, canvas); }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#0d1b2a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
    }
    lastPos.current = pos;
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); setIsDrawing(false); lastPos.current = null; }
  function clearCanvas() { const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); setHasDrawn(false); }
  function handleSign() { const canvas = canvasRef.current; if (!canvas) return; onSign(canvas.toDataURL("image/png")); }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-primary" />Sign Your {formTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Draw your signature below using your mouse or finger.</p>
        </DialogHeader>
        <div className="rounded-xl border-2 border-dashed border-input bg-[#fdfdfc] relative overflow-hidden" style={{ touchAction: "none" }}>
          <canvas ref={canvasRef} width={600} height={150} className="w-full cursor-crosshair" style={{ display: "block" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          <div className="absolute bottom-6 left-6 right-6 border-b border-gray-300 pointer-events-none" />
          {!hasDrawn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-muted-foreground/40 text-sm select-none">Sign here ↑</p></div>}
        </div>
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 leading-relaxed">{disclaimer ?? `By signing, you declare under penalty of perjury under the laws of the State of California that the information on your ${formTitle} is true and correct.`}</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSign} disabled={!hasDrawn} className="flex-1 gap-2 bg-[#0d6b5e] hover:bg-[#0a5549] text-white">
              <Download className="h-4 w-4" />Sign &amp; Download
            </Button>
            <Button variant="ghost" size="icon" onClick={clearCanvas} disabled={!hasDrawn} title="Clear signature"><RotateCcw className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" onClick={onSkipSign} className="w-full text-sm">Skip — Download Without Signature</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Packet Rules Engine ──────────────────────────────────────────────────────
function _getRecommendedForms(c: ExtendedCase): Array<{ id: string; number: string; required: boolean; reason: string }> {
  if (!c?.plaintiffName) return [];

  const forms: Array<{ id: string; number: string; required: boolean; reason: string }> = [];

  forms.push({ id: "sc100", number: "SC-100", required: true,
    reason: "Required to open every small claims case — file this first." });

  if (c.plaintiffIsBusiness) {
    forms.push({ id: "sc103", number: "SC-103", required: true,
      reason: "You are filing as a business — DBA registration form required." });
  }

  if (c.hasAdditionalPlaintiff) {
    forms.push({ id: "sc100a", number: "SC-100A", required: true,
      reason: "You have an additional plaintiff — this form must be filed alongside SC-100." });
  }

  if (c.hasAdditionalPlaintiff && c.additionalPlaintiffIsFictitious) {
    forms.push({ id: "sc103b", number: "SC-103", required: true,
      reason: "Plaintiff 2 operates under a DBA — a second SC-103 is required for that plaintiff." });
  }

  forms.push({ id: "mc030", number: "MC-030", required: true,
    reason: "Sworn declaration filed at the same time as SC-100." });

  forms.push({ id: "sc112a", number: "SC-112A", required: true,
    reason: "Proves the defendant was properly served with your court papers." });

  forms.push({ id: "fw001", number: "FW-001", required: false,
    reason: "Optional — request to waive filing fees if you qualify financially." });

  return forms;
}

// ─── Phase Header ─────────────────────────────────────────────────────────────
function _PhaseHeader({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className="shrink-0 h-10 w-10 rounded-full bg-[#0d6b5e] flex items-center justify-center shadow-sm">
        <span className="text-white font-black text-base">{number}</span>
      </div>
      <div className="pt-0.5">
        <h3 className="text-lg font-bold text-foreground leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Forms Tab ────────────────────────────────────────────────────────────────
export function FormsTab({ caseId, currentCase, onSwitchToIntake: _onSwitchToIntake, onSwitchToPrep: _onSwitchToPrep, isDraftMode = false }: { caseId: number, currentCase: ExtendedCase, onSwitchToIntake: () => void, onSwitchToPrep: () => void, isDraftMode?: boolean }) {
  const [, navigate] = useLocation();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });

  // ── Core download state ────────────────────────────────────────────────────
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [guideDialogFormId, setGuideDialogFormId] = useState<string | null>(null);
  const [modalFormId, setModalFormId] = useState<string | null>(null);
  const [modalInitialValues, setModalInitialValues] = useState<Record<string, string>>({});
  const [downloadingForm, setDownloadingForm] = useState<string | null>(null);
  const [fw001BlobUrl, setFw001BlobUrl] = useState<string | null>(null);
  const [fw001Loading, setFw001Loading] = useState(false);
  const [fw001SigModalOpen, setFw001SigModalOpen] = useState(false);
  useEffect(() => {
    return () => { if (fw001BlobUrl) URL.revokeObjectURL(fw001BlobUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [mc030SigModalOpen, setMc030SigModalOpen] = useState(false);
  const [sc104SigModalOpen, setSc104SigModalOpen] = useState(false);
  const [sc104Fields] = useState<Record<string, string>>(() => {
    const saved = currentCase?.sc104Data as Record<string, string> | null | undefined;
    if (saved && Object.keys(saved).length > 0) return saved;
    // Auto-seed from intake data when no saved data exists
    const cc = currentCase;
    const isBusiness = !!cc?.defendantIsBusinessOrEntity;
    const hasMc030 = !!cc?.mc030DeclarationTitle;
    return {
      personServedName: isBusiness ? "" : (cc?.defendantName || ""),
      businessName: isBusiness ? (cc?.defendantName || "") : "",
      authorizedPerson: isBusiness ? (cc?.defendantAgentName || "") : "",
      authorizedTitle: isBusiness ? (cc?.defendantAgentTitle || "") : "",
      docsServed_sc100: "yes",
      docsServedOther: hasMc030 ? "MC-030 Declaration" : "",
      serviceAddress: cc?.defendantAddress || "",
      serviceCity: cc?.defendantCity || "",
      serviceState: cc?.defendantState || "CA",
      serviceZip: cc?.defendantZip || "",
    };
  });
  const [sc100aSigModalOpen, setSc100aSigModalOpen] = useState(false);
  const [sc103SigModalOpen, setSc103SigModalOpen] = useState(false);
  const [sc103bSigModalOpen, setSc103bSigModalOpen] = useState(false);
  const [sc100aFormBody, setSc100aFormBody] = useState<Record<string, unknown> | null>(null);
  const [flSigModal, setFlSigModal] = useState<{ endpoint: string; filename: string; title?: string } | null>(null);
  const [txServiceMethod, setTxServiceMethod] = useState<string>("");
  const [flServiceMethod, setFlServiceMethod] = useState<string>("");


  // ── SC-100 view / edit overrides state ─────────────────────────────────────
  const [viewingPdf, setViewingPdf] = useState(false);
  const [sc100EditOpen, setSc100EditOpen] = useState(false);
  const [sc100Fields, setSc100Fields] = useState<Record<string, string>>({});
  const [downloadingWithOverrides, setDownloadingWithOverrides] = useState(false);

  // ── MC-030 inline editor state ─────────────────────────────────────────────
  const [mc030Title, setMc030Title] = useState<string>(
    currentCase?.mc030DeclarationTitle ||
    (currentCase?.plaintiffName ? `DECLARATION OF ${currentCase.plaintiffName.toUpperCase()} IN SUPPORT OF CLAIM` : "")
  );
  const [mc030Text, setMc030Text] = useState("");
  const [mc030ExhibitOrder, setMc030ExhibitOrder] = useState<number[]>([]);
  const [mc030AiGenerating, setMc030AiGenerating] = useState(false);
  const [mc030AiError, setMc030AiError] = useState<string | null>(null);
  const [mc030PopoutOpen, setMc030PopoutOpen] = useState(false);
  // Initialise from DB-persisted value; null means "never saved" → auto-select all docs.
  const savedExhibitIds = Array.isArray(currentCase?.mc030ExhibitDocIds)
    ? (currentCase.mc030ExhibitDocIds as number[])
    : null;
  const [selectedExhibits, setSelectedExhibits] = useState<number[]>(savedExhibitIds ?? []);
  const [buildingPacket, setBuildingPacket] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [wizardIndex, setWizardIndex] = useState(() => {
    try {
      const stored = localStorage.getItem(`sc_forms_step_${caseId}`);
      const n = stored !== null ? parseInt(stored, 10) : 0;
      return isNaN(n) ? 0 : n;
    } catch { return 0; }
  });
  useEffect(() => {
    try { localStorage.setItem(`sc_forms_step_${caseId}`, String(wizardIndex)); } catch {}
  }, [wizardIndex, caseId]);
    const [flWizardIndex, setFlWizardIndex] = useState(() => {
      try {
        const stored = localStorage.getItem(`fl_forms_step_${caseId}`);
        const n = stored !== null ? parseInt(stored, 10) : 0;
        return isNaN(n) ? 0 : n;
      } catch { return 0; }
    });
    useEffect(() => {
      try { localStorage.setItem(`fl_forms_step_${caseId}`, String(flWizardIndex)); } catch {}
    }, [flWizardIndex, caseId]);
    const [txWizardIndex, setTxWizardIndex] = useState(() => {
      try {
        const stored = localStorage.getItem(`tx_forms_step_${caseId}`);
        const n = stored !== null ? parseInt(stored, 10) : 0;
        return isNaN(n) ? 0 : n;
      } catch { return 0; }
    });
    useEffect(() => {
      try { localStorage.setItem(`tx_forms_step_${caseId}`, String(txWizardIndex)); } catch {}
    }, [txWizardIndex, caseId]);
    const [ilWizardIndex, setIlWizardIndex] = useState(() => {
      try {
        const stored = localStorage.getItem(`il_forms_step_${caseId}`);
        const n = stored !== null ? parseInt(stored, 10) : 0;
        return isNaN(n) ? 0 : n;
      } catch { return 0; }
    });
    useEffect(() => {
      try { localStorage.setItem(`il_forms_step_${caseId}`, String(ilWizardIndex)); } catch {}
    }, [ilWizardIndex, caseId]);
    const [ncWizardIndex, setNcWizardIndex] = useState(() => {
      try {
        const stored = localStorage.getItem(`nc_forms_step_${caseId}`);
        const n = stored !== null ? parseInt(stored, 10) : 0;
        return isNaN(n) ? 0 : n;
      } catch { return 0; }
    });
    useEffect(() => {
      try { localStorage.setItem(`nc_forms_step_${caseId}`, String(ncWizardIndex)); } catch {}
    }, [ncWizardIndex, caseId]);
    const [vaWizardIndex, setVaWizardIndex] = useState(() => {
      try {
        const stored = localStorage.getItem(`va_forms_step_${caseId}`);
        const n = stored !== null ? parseInt(stored, 10) : 0;
        return isNaN(n) ? 0 : n;
      } catch { return 0; }
    });
    useEffect(() => {
      try { localStorage.setItem(`va_forms_step_${caseId}`, String(vaWizardIndex)); } catch {}
    }, [vaWizardIndex, caseId]);
    const [ilServiceMethod, setIlServiceMethod] = useState<string>("");
    const [notifyMethod, setNotifyMethod] = useState<string>(currentCase.notifyMethod ?? "");

  // ── Documents for exhibit selector ────────────────────────────────────────
  const [documents, setDocuments] = useState<DocumentWithMeta[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    async function fetchDocs() {
      setDocsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`/api/cases/${caseId}/documents`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDocuments(await res.json());
      } catch { /* silent */ }
      finally { setDocsLoading(false); }
    }
    fetchDocs();
  }, [caseId, getToken]);

  // Whenever the documents list changes, auto-select any document not yet in the
  // selection — but only when there is no prior saved selection in the DB.
  // If the DB already has a selection (savedExhibitIds !== null) we honour it
  // and do NOT silently add newly-uploaded docs.
  useEffect(() => {
    if (savedExhibitIds !== null) return;
    setSelectedExhibits(prev => {
      const prevSet = new Set(prev);
      const merged = [...prev];
      for (const doc of documents) {
        if (!prevSet.has(doc.id)) merged.push(doc.id);
      }
      return merged.length === prev.length ? prev : merged;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  // ── Auto-save selectedExhibits to DB whenever they change (debounced 1s) ────
  const exhibitSaveIsFirstRender = useRef(true);
  useEffect(() => {
    if (exhibitSaveIsFirstRender.current) { exhibitSaveIsFirstRender.current = false; return; }
    const t = setTimeout(async () => {
      try {
        const token = await getToken();
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mc030ExhibitDocIds: selectedExhibits }),
        });
      } catch { /* silent — best-effort */ }
    }, 1000);
    return () => clearTimeout(t);
  }, [selectedExhibits, caseId, getToken]);

  // ── Auto-save notifyMethod to DB whenever it changes ────────────────────────
  const notifyMethodInitial = useRef(notifyMethod);
  useEffect(() => {
    if (notifyMethod === notifyMethodInitial.current) return;
    notifyMethodInitial.current = notifyMethod;
    const t = setTimeout(async () => {
      try {
        const token = await getToken();
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notifyMethod }),
        });
      } catch { /* silent — best-effort */ }
    }, 500);
    return () => clearTimeout(t);
  }, [notifyMethod, caseId, getToken]);

  // ── Auto-save mc030Title to DB whenever it changes (debounced 1s) ──────────
  const mc030TitleInitial = useRef(mc030Title);
  useEffect(() => {
    if (mc030Title === mc030TitleInitial.current) return; // skip initial render
    const t = setTimeout(async () => {
      try {
        const token = await getToken();
        await fetch(`/api/cases/${caseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ mc030DeclarationTitle: mc030Title }),
        });
      } catch { /* silent — best-effort */ }
    }, 1000);
    return () => clearTimeout(t);
  }, [mc030Title, caseId, getToken]);

  useEffect(() => {
    if (downloadError) { toast({ title: "Download failed", description: downloadError, variant: "destructive" }); setDownloadError(null); }
  }, [downloadError, toast]);

  const score = readiness?.score ?? currentCase.readinessScore ?? 0;
  const isReady = score >= 80;
  const isBusinessCase: boolean | null = currentCase.plaintiffIsBusiness ?? null;
  const _intakeStarted = currentCase.intakeStep != null && currentCase.intakeStep > 1;
  const isSuingPublicEntity = currentCase.isSuingPublicEntity === true;
  const claimAmount = Number(currentCase.claimAmount || 0);

  // Phase 2 visibility
  const showSC100A = true;
  const showSC103 = isBusinessCase === true;
  const showSC103B = !!(currentCase.hasAdditionalPlaintiff && currentCase.additionalPlaintiffIsFictitious);
  const showPublicEntityBlock = isSuingPublicEntity;
  const showLimitWarning = claimAmount > 10000;
  const _showPhase2 = showSC100A || showSC103 || showPublicEntityBlock || showLimitWarning;

  const guideDialogForm = FORMS_CATALOG.find(f => f.id === guideDialogFormId) ?? null;

  // ── Download utilities ─────────────────────────────────────────────────────
  async function downloadSignedFLForm(endpoint: string, filename: string, signatureDataUrl?: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    const formKey = signatureDataUrl ? `${endpoint}/signed` : endpoint;
    setDownloadingForm(formKey); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const apiEndpoint = signatureDataUrl ? `${endpoint}/signed` : endpoint;
      const body: Record<string, unknown> = { token };
      if (signatureDataUrl) body.signatureDataUrl = signatureDataUrl;
      const res = await fetch(`/api/cases/${caseId}/forms/${apiEndpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFlSigModal(null);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  function deriveFlSigTitle(endpoint: string): string {
      if (endpoint === "tx/petition") return "Texas Small Claims Petition";
      if (endpoint === "tx/citation") return "Texas Citation";
      if (endpoint === "tx/return-of-service") return "Texas Return of Service";
      if (endpoint === "tx/fee-waiver") return "TX Fee Waiver";
      if (endpoint === "il/smc-complaint") return "Illinois Small Claims Complaint";
      if (endpoint === "il/summons") return "Illinois Small Claims Summons";
      if (endpoint === "il/proof-of-service") return "Illinois Proof of Service";
      if (endpoint === "il/fee-waiver") return "IL Fee Waiver";
      if (endpoint.startsWith("il/")) return "Illinois Small Claims Form";
      if (endpoint.includes("summons") || endpoint === "fl/clkct423") return "Summons / Notice to Appear";
      if (endpoint === "fl/proof-of-service") return "Florida Proof of Service";
      if (endpoint === "fl/fee-waiver") return "FL Fee Waiver";
      if (endpoint === "nj/complaint") return "New Jersey Small Claims Complaint";
      if (endpoint === "wa/notice") return "Washington Notice of Small Claim";
      if (endpoint === "wa/service") return "Washington Certificate of Service";
      return "Statement of Claim";
    }

  function openFlSigModal(modal: { endpoint: string; filename: string; title?: string }) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setFlSigModal({ ...modal, title: modal.title ?? deriveFlSigTitle(modal.endpoint) });
  }

  async function downloadFormPost(endpoint: string, filename: string, body: Record<string, unknown>) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download and save court forms." }); return; }
    setDownloadingForm(endpoint); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, token }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setModalFormId(null);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  async function downloadSignedSC104(signatureDataUrl?: string, rawFields?: Record<string, string> | null) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingForm("sc104"); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      // Convert UI field keys → server body format (docsServed array etc.)
      const sourceFields = rawFields ?? sc104Fields;
      const formBody = sc104FieldsToBody(sourceFields);
      const endpoint = signatureDataUrl ? "sc104/signed" : "sc104";
      const filename = signatureDataUrl ? `SC-104_Proof_of_Service_prefilled-signed.pdf` : `SC-104_Proof_of_Service_prefilled.pdf`;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formBody, signatureDataUrl, token }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate SC-104 PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalFormId(null);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  async function openSC104InNewTab() {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    // Open the window synchronously (direct response to user click) before any
    // async operations — this prevents popup blockers from suppressing it.
    const win = window.open("", "_blank");
    if (!win) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site, then try again." });
      return;
    }
    setDownloadingForm("sc104"); setDownloadError(null);
    try {
      // Use the download-token pattern (same as every other form) so the PDF
      // endpoint never needs to verify a short-lived Clerk JWT directly.
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      if (!tokenRes.ok) { win.close(); setDownloadError("Could not authorize — please try again."); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/sc104`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sc104FieldsToBody(sc104Fields), token }),
      });
      if (!res.ok) { win.close(); setDownloadError("Failed to generate SC-104 PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { win.close(); setDownloadError("Failed to open SC-104 PDF — please try again."); }
    finally { setDownloadingForm(null); }
  }



  async function downloadSignedSC100A(signatureDataUrl?: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingForm("sc100a"); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const formBody = sc100aFormBody || {};
      const endpoint = signatureDataUrl ? "sc100a/signed" : "sc100a";
      const filename = signatureDataUrl ? `SC100A-Signed-Case-${caseId}.pdf` : `SC100A-Case-${caseId}.pdf`;
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formBody, signature1DataUrl: signatureDataUrl, token }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate SC-100A PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalFormId(null);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  async function downloadSignedSC103(signatureDataUrl?: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingForm("sc103"); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const filename = signatureDataUrl ? `SC103-Signed-Case-${caseId}.pdf` : `SC103-Case-${caseId}.pdf`;
      const res = await fetch(`/api/cases/${caseId}/forms/sc103`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, token }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate SC-103 PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  async function downloadSignedSC103B(signatureDataUrl?: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingForm("sc103b"); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const filename = signatureDataUrl ? `SC103B-Signed-Case-${caseId}.pdf` : `SC103B-Case-${caseId}.pdf`;
      const res = await fetch(`/api/cases/${caseId}/forms/sc103-secondary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, token }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setDownloadError(err.error || "Failed to generate SC-103 (Plaintiff 2) PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingForm(null); }
  }

  async function downloadSignedSC100(signatureDataUrl?: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingPdf(true); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const endpoint = signatureDataUrl ? "sc100/signed" : "sc100";
      const filename = signatureDataUrl ? `SC100-Signed-Case-${caseId}.pdf` : `SC100-Case-${caseId}.pdf`;
      let res: Response;
      if (signatureDataUrl) {
        res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureDataUrl, token }),
        });
      } else {
        res = await fetch(`/api/cases/${caseId}/forms/${endpoint}?token=${encodeURIComponent(token)}`, { method: "GET" });
      }
      if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; setDownloadError(err.error || "Failed to generate PDF — please try again."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setDownloadingPdf(false); }
  }

  async function viewFormInNewTab(endpoint: string, body: Record<string, unknown>, label: string) {
    if (isDraftMode) { toast({ title: "Subscribe to View", description: `Start your subscription to preview your pre-filled ${label}.` }); return; }
    setViewingPdf(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { toast({ title: "Could not authorize preview", description: "Please try again.", variant: "destructive" }); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast({ title: `Could not load ${label}`, description: (e as { error?: string }).error || "Please try again.", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site, then try again." });
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch { toast({ title: `Could not load ${label}`, description: "Please try again.", variant: "destructive" }); }
    finally { setViewingPdf(false); }
  }

  function viewSC100A() { return viewFormInNewTab("sc100a", { signDate: new Date().toISOString().split("T")[0] }, "SC-100A"); }
  function viewSC103() { return viewFormInNewTab("sc103", {}, "SC-103"); }

  async function viewSC100() {
    if (isDraftMode) { toast({ title: "Subscribe to View", description: "Start your subscription to preview your pre-filled SC-100." }); return; }
    setViewingPdf(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { toast({ title: "Could not authorize preview", description: "Please try again.", variant: "destructive" }); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/sc100?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Could not load SC-100", description: (err as { error?: string }).error || "Please try again.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site, then try again." });
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast({ title: "Could not load SC-100", description: "Please try again.", variant: "destructive" });
    } finally {
      setViewingPdf(false);
    }
  }


  async function downloadWithOverrides() {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    setDownloadingWithOverrides(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) throw new Error("Token failed");
      const { token } = await tokenRes.json();
      const overrides: Record<string, unknown> = { token };
      // Map yes/no strings back to booleans for the fields that need it
      for (const [k, v] of Object.entries(sc100Fields)) {
        if (["priorDemandMade", "isSuingPublicEntity", "isAttyFeeDispute", "filedMoreThan12Claims"].includes(k)) {
          overrides[k] = v === "yes" ? true : v === "no" ? false : null;
        } else if (k === "claimAmount") {
          overrides[k] = v ? Number(v) : null;
        } else {
          overrides[k] = v || null;
        }
      }
      const res = await fetch(`/api/cases/${caseId}/forms/sc100/with-overrides?download=1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Generation failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `SC100-Case-${caseId}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSc100EditOpen(false);
      toast({ title: "SC-100 downloaded", description: "Your customized SC-100 has been saved." });
    } catch (e: unknown) {
      toast({ title: "Download failed", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally {
      setDownloadingWithOverrides(false);
    }
  }

  async function generateSC105Draft(): Promise<{ orderRequested: string; orderReason: string }> {
    const clerkToken = await getToken();
    const res = await fetch(`/api/cases/${caseId}/forms/sc105/ai-draft`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` }, body: JSON.stringify({}) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "AI draft failed — please try again.");
    }
    const data = await res.json();
    return { orderRequested: data.orderRequested || "", orderReason: data.orderReason || "" };
  }

  async function generateMC030Declaration(): Promise<string | null> {
    setMc030AiGenerating(true); setMc030AiError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-ai`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` }, body: JSON.stringify({ exhibitDocIds: orderedExhibitIds }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setMc030AiError(err.error || "AI generation failed."); return null; }
      const data = await res.json();
      const text = data.declarationText ?? null;
      if (text) setMc030Text(text);
      // Capture generated title so SC-100 Section 3 can match the MC-030 exactly
      if (data.declarationTitle) {
        mc030TitleInitial.current = data.declarationTitle; // avoid double-PATCH (save already done by server)
        setMc030Title(data.declarationTitle);
      }
      // Store exhibit order so download routes can arrange physical tabs to match the narrative
      if (Array.isArray(data.exhibitOrder)) setMc030ExhibitOrder(data.exhibitOrder);
      return text;
    } catch { setMc030AiError("AI generation failed — please try again."); return null; }
    finally { setMc030AiGenerating(false); }
  }

  async function downloadMC030Packet() {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download and save court forms." }); return; }
    if (!mc030Text.trim()) { toast({ title: "Declaration required", description: "Please write or generate your declaration text first.", variant: "destructive" }); return; }
    setBuildingPacket(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-with-exhibits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, declarationTitle: mc030Title || undefined, declarationText: mc030Text, exhibitDocIds: orderedExhibitIds, exhibitOrder: mc030ExhibitOrder.length > 0 ? mc030ExhibitOrder : undefined }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); toast({ title: "Build failed", description: err.error || "Failed to build packet.", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `MC030-Filing-Packet-Case-${caseId}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Filing packet downloaded", description: selectedExhibits.length > 0 ? `MC-030 + ${selectedExhibits.length} exhibit${selectedExhibits.length > 1 ? "s" : ""} bundled.` : "MC-030 declaration downloaded." });
    } catch { toast({ title: "Download failed", description: "Please try again.", variant: "destructive" }); }
    finally { setBuildingPacket(false); }
  }

  async function downloadSignedMC030(signatureDataUrl: string) {
    if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
    if (!mc030Text.trim()) { toast({ title: "Declaration required", description: "Please write or generate your declaration text first.", variant: "destructive" }); return; }
    setBuildingPacket(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { toast({ title: "Could not authorize download", description: "Please try again.", variant: "destructive" }); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030/signed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, declarationTitle: mc030Title || undefined, declarationText: mc030Text, signatureDataUrl, exhibitDocIds: orderedExhibitIds, exhibitOrder: mc030ExhibitOrder.length > 0 ? mc030ExhibitOrder : undefined }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})) as { error?: string }; toast({ title: "Build failed", description: err.error || "Failed to build signed MC-030.", variant: "destructive" }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `MC030-Signed-Case-${caseId}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Signed MC-030 downloaded", description: selectedExhibits.length > 0 ? `Signed MC-030 + ${selectedExhibits.length} exhibit${selectedExhibits.length > 1 ? "s" : ""} bundled.` : "Your signed declaration is ready to file." });
    } catch { toast({ title: "Download failed", description: "Please try again.", variant: "destructive" }); }
    finally { setBuildingPacket(false); }
  }

  function toggleExhibit(docId: number) {
    setSelectedExhibits(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  }

  function getInitialValues(formId: string): Record<string, string> {
    const cc = currentCase;
    const courthouseStreet = cc.courthouseAddress || "";
    const plaintiffAddr = [cc.plaintiffAddress, cc.plaintiffCity, cc.plaintiffState || "CA", cc.plaintiffZip].filter(Boolean).join(", ");
    const defAddr = [cc.defendantAddress, cc.defendantCity, cc.defendantState || "CA", cc.defendantZip].filter(Boolean).join(", ");

    const courthouseLabel = cc.courthouseName ? `${cc.courthouseName} — ${courthouseStreet}` : courthouseStreet;
    switch (formId) {
      case "sc100a": return {
        // Pre-fill today's date so the Signature group is hidden (all plaintiff data
        // already comes from intake; the user only needs to optionally add a defendant).
        signDate: new Date().toISOString().split("T")[0],
      };
      case "sc112a": {
        const defMailingAddr = [
          cc.defendantMailingAddress || cc.defendantAddress,
          cc.defendantMailingCity || cc.defendantCity,
          cc.defendantMailingState || cc.defendantState || "CA",
          cc.defendantMailingZip || cc.defendantZip,
        ].filter(Boolean).join(", ");
        return {
          party1Name: cc.defendantName || "",
          party1Address: defMailingAddr,
          mailingCity: cc.plaintiffCity || "",
        };
      }
      case "sc103": return {
        attachedTo: "sc100",
        businessName: cc.plaintiffDbaName || cc.plaintiffName || "",
        businessAddress: [cc.plaintiffDbaAddress, cc.plaintiffDbaCity, cc.plaintiffDbaState || "CA", cc.plaintiffDbaZip].filter(Boolean).join(", "),
        mailingAddress: cc.plaintiffDbaMailingAddress || "",
        businessType: (cc as any).plaintiffBusinessType || "",
        businessTypeOther: (cc as any).plaintiffBusinessTypeOther || "",
        fbnCounty: String(cc.countyId || "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        fbnNumber: (cc as any).plaintiffFbnNumber || "",
        fbnExpiry: (cc as any).plaintiffFbnExpiry || "",
        signerName: cc.plaintiffName || "",
        signDate: (cc as any).plaintiffFbnSignDate || "",
      };
      case "sc104": return {
        courtStreet: courthouseStreet,
        hearingDate: cc.hearingDate || "",
        hearingTime: cc.hearingTime || "",
        hearingDept: cc.hearingCourtroom || "",
        personServedName: cc.defendantIsBusinessOrEntity ? "" : (cc.defendantName || ""),
        businessName: cc.defendantIsBusinessOrEntity ? (cc.defendantName || "") : "",
        docsServed_sc100: "yes",
      };
      case "sc105": return {
        courtStreet: courthouseStreet,
        requestingPartyName: cc.plaintiffName || "",
        requestingPartyAddress: plaintiffAddr,
        requestingPartyRole: "plaintiff",
        notice1Name: cc.defendantName || "",
        notice1Address: defAddr,
      };
      case "sc120": return {
        priorDemand: "false",
        attyFeeDispute: "false",
        suingPublicEntity: "false",
        moreThan12: "false",
      };
      case "sc140": return {
        courtName: courthouseLabel,
        appellantRole: "plaintiff",
        appellantName: cc.plaintiffName || "",
      };
      case "sc150": return {
        courtStreet: courthouseStreet,
        requestingPartyName: cc.plaintiffName || "",
        requestingPartyAddress: plaintiffAddr,
        requestingPartyPhone: cc.plaintiffPhone || "",
        requestingPartyRole: "plaintiff",
        currentTrialDate: cc.hearingDate || "",
      };
      default: return {};
    }
  }

  const EXHIBIT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Exhibits in document-list order (A = first doc in list that is checked, etc.)
  // This is the canonical order sent to the backend as exhibitDocIds.
  const orderedExhibitIds = documents
    .filter((d: DocumentWithMeta) => selectedExhibits.includes(d.id))
    .map((d: DocumentWithMeta) => d.id);

  // After AI generation, reorder selected exhibits by the AI's first-mention order
  // so labels and display both match the declaration narrative.
  // mc030ExhibitOrder is 1-based indices into orderedExhibitIds.
  const aiOrderedExhibitIds: number[] =
    mc030ExhibitOrder.length > 0 && mc030ExhibitOrder.length === orderedExhibitIds.length
      ? mc030ExhibitOrder.map(i => orderedExhibitIds[i - 1]).filter((id): id is number => id !== undefined)
      : orderedExhibitIds;

  // For display: selected exhibits in AI order first, then unselected docs after.
  const displayDocList: typeof documents = mc030ExhibitOrder.length > 0
    ? [
        ...aiOrderedExhibitIds
          .map(id => documents.find((d: DocumentWithMeta) => d.id === id))
          .filter((d): d is DocumentWithMeta => d !== undefined),
        ...documents.filter((d: DocumentWithMeta) => !selectedExhibits.includes(d.id)),
      ]
    : documents;

  // ── Wizard steps ──────────────────────────────────────────────────────────
  type StepStatus = "required" | "optional" | "skipped";
  const allWizardSteps = useMemo(() => {
    return [
      { id: "sc100",  number: "SC-100",  shortLabel: "Plaintiff's Claim",  status: "required" as StepStatus },
      { id: "mc030",  number: "MC-030",  shortLabel: "Declaration",         status: "required" as StepStatus },
      { id: "sc112a", number: "Serve Defendant Court Filed Papers", shortLabel: "Choose Delivery Method", status: "required" as StepStatus },
      { id: "sc103",  number: "SC-103",  shortLabel: "DBA — Plaintiff 1", status: (showSC103 ? "required" : "skipped") as StepStatus },
      { id: "sc103b", number: "SC-103",  shortLabel: "DBA — Plaintiff 2", status: (showSC103B ? "required" : "skipped") as StepStatus },
      ...(currentCase.hasAdditionalPlaintiff ? [{ id: "sc100a", number: "SC-100A", shortLabel: "Other Parties", status: "required" as StepStatus }] : []),
      { id: "sc104",  number: "SC-104",  shortLabel: "Personal Service",   status: "optional" as StepStatus },
      { id: "sc150",  number: "SC-150",  shortLabel: "Postpone Trial",     status: "optional" as StepStatus },
      { id: "fw001",  number: "FW-001",  shortLabel: "Fee Waiver",         status: "optional" as StepStatus },
    ];
  }, [showSC103, showSC103B, currentCase.hasAdditionalPlaintiff, currentCase.additionalPlaintiffName]);
  // Primary wizard: required forms, then sc112a pinned second-to-last, then fw001 pinned last
  const wizardSteps = useMemo(() => {
    const body = allWizardSteps.filter(s => s.status === "required" && s.id !== "sc112a");
    const sc112a = allWizardSteps.find(s => s.id === "sc112a");
    const fw001  = allWizardSteps.find(s => s.id === "fw001");
    return [...body, ...(sc112a ? [sc112a] : []), ...(fw001 ? [fw001] : [])];
  }, [allWizardSteps]);
  // Additional section: optional forms below (FW-001 excluded — it lives in the tracker)
  const additionalSteps = useMemo(
    () => allWizardSteps.filter(s => s.status === "optional" && s.id !== "fw001"),
    [allWizardSteps]
  );

  const currentStep = wizardSteps[Math.min(wizardIndex, wizardSteps.length - 1)];
  const catalogCurrentForm = FORMS_CATALOG.find(f => f.id === currentStep.id);
  const guideCurrentForm = FORM_GUIDE_CONTENT[currentStep.id];
  const stepWarnings = guideCurrentForm?.warnings ?? [];
  const stepRelatedForms = guideCurrentForm?.relatedForms ?? [];

  function renderStepBody(): React.ReactNode {

    const commonWarnings = stepWarnings.length > 0 ? (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex gap-2">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
        <ul className="text-xs text-amber-800 space-y-0.5">
          {stepWarnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    ) : null;

    const commonRelated = stepRelatedForms.length > 0 ? (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Also file with</p>
        <div className="flex flex-col gap-0.5">
          {stepRelatedForms.map((rf, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="font-semibold text-foreground">{rf.number}</span>&nbsp;—&nbsp;{rf.reason}
            </div>
          ))}
        </div>
      </div>
    ) : null;

    switch (currentStep.id) {
      case "sc100":
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
              MC-030 Declaration is included with every California case. Your SC-100 will reference it — file both with the clerk at the same time for the strongest evidence packet.
            </div>
            {showPublicEntityBlock && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-900 mb-1">Special Rules — Suing a Government Agency</h4>
                  <p className="text-sm text-rose-800">You must file a government tort claim (Gov. Code § 910) and wait for rejection before filing in small claims court.</p>
                </div>
              </div>
            )}
            {showLimitWarning && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900 mb-1">Claim Near the Limit — ${claimAmount.toLocaleString()}</h4>
                  <p className="text-sm text-amber-800">
                    {claimAmount > 12500
                      ? "Your claim exceeds $12,500. Individual plaintiffs are capped — you may need to reduce your claim or file in a higher court."
                      : "Your claim is approaching the small claims limit. Businesses are capped at $6,250."}
                  </p>
                </div>
              </div>
            )}
            {commonWarnings}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={viewSC100} disabled={viewingPdf || downloadingPdf}>
                {viewingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View My SC-100 Plaintiff's Claim
              </Button>
              <Button size="sm" className="gap-1.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white h-8 text-xs px-3"
                onClick={() => setSigModalOpen(true)} disabled={downloadingPdf || viewingPdf}>
                {downloadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download SC-100
              </Button>
            </div>
          </div>
        );

      case "mc030":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Declaration Title <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input type="text" value={mc030Title} onChange={e => setMc030Title(e.target.value)}
                placeholder="e.g. Declaration of Jane Doe in Support of Claim"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Sworn Statement <span className="text-rose-500">*</span></label>
                <button
                  onClick={() => setMc030PopoutOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/60"
                  title="Open full editor"
                >
                  <Maximize2 className="h-3 w-3" />
                  Expand
                </button>
              </div>
              <textarea value={mc030Text} onChange={e => setMc030Text(e.target.value)}
                placeholder="Write your declaration here. Use numbered paragraphs: '1. On January 15, 2025, I paid defendant $2,400 for…'"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent resize-none overflow-y-auto" rows={15} />
              {mc030AiError && <p className="text-xs text-rose-600 mt-1">{mc030AiError}</p>}
            </div>

            {/* ── Pop-out full editor dialog ── */}
            <Dialog open={mc030PopoutOpen} onOpenChange={setMc030PopoutOpen}>
              <DialogContent className="max-w-3xl w-full h-[90vh] flex flex-col gap-0 p-0">
                <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
                  <DialogTitle className="text-base font-semibold">Edit Sworn Statement</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Changes are saved automatically as you type.</p>
                </DialogHeader>
                <div className="flex-1 min-h-0 px-6 py-4">
                  <textarea
                    value={mc030Text}
                    onChange={e => setMc030Text(e.target.value)}
                    placeholder="Write your declaration here. Use numbered paragraphs: '1. On January 15, 2025, I paid defendant $2,400 for…'"
                    className="w-full h-full rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent resize-none overflow-y-auto font-mono"
                    autoFocus
                  />
                </div>
                <DialogFooter className="px-6 pb-5 pt-3 border-t border-border shrink-0 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{mc030Text.length} characters</span>
                  <Button size="sm" onClick={() => setMc030PopoutOpen(false)} className="bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 px-5 text-xs">
                    Done
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Attached Exhibits</span>
                {documents.length > 0 && <span className="text-[10px] text-muted-foreground">({selectedExhibits.length} of {documents.length} included — uncheck to exclude)</span>}
              </div>
              {docsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" />Loading uploaded documents…</div>
              ) : documents.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">
                  No documents uploaded yet. Upload evidence in the Documents tab to include exhibits here.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-lg border border-border p-2">
                  {displayDocList.map((doc: DocumentWithMeta, _idx: number) => {
                    const isSelected = selectedExhibits.includes(doc.id);
                    const orderedIdx = isSelected ? aiOrderedExhibitIds.indexOf(doc.id) : -1;
                    const exhibitLetter = isSelected ? EXHIBIT_LETTERS[orderedIdx] ?? String(orderedIdx + 1) : null;
                    return (
                      <label key={doc.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[#0d6b5e]/8 border border-[#0d6b5e]/25" : "hover:bg-muted/50 border border-transparent"}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleExhibit(doc.id)} className="rounded border-input h-4 w-4 accent-[#0d6b5e]" />
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs text-foreground truncate flex-1">{doc.description || doc.originalName || doc.filename}</span>
                        {exhibitLetter && <span className="shrink-0 text-[10px] font-black bg-[#0d6b5e] text-white px-1.5 py-0.5 rounded-full">EXHIBIT {exhibitLetter}</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={downloadMC030Packet} disabled={buildingPacket || !mc030Text.trim()}>
                {buildingPacket ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                {buildingPacket ? "Building packet…" : selectedExhibits.length > 0 ? `Build Filing Packet (MC-030 + ${selectedExhibits.length} Exhibit${selectedExhibits.length > 1 ? "s" : ""})` : "Download MC-030"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-3 border-[#0d6b5e]/40 text-[#0d6b5e] hover:bg-[#0d6b5e]/10"
                onClick={() => { if (!mc030Text.trim()) { toast({ title: "Declaration required", description: "Please write or generate your declaration text first.", variant: "destructive" }); return; } setMc030SigModalOpen(true); }}
                disabled={buildingPacket}>
                <PenLine className="h-3 w-3" />Sign &amp; Download
              </Button>
            </div>
          </div>
        );

      case "sc112a":
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <RadioGroup value={notifyMethod} onValueChange={setNotifyMethod} className="gap-0">

                {/* Radio 1 — Process Server — Best overall option */}
                <label
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                  onClick={(e) => { if (notifyMethod === "process_server") { e.preventDefault(); setNotifyMethod(""); } }}
                >
                  <RadioGroupItem value="process_server" id="notify-ps" className="mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}/efile`); }}
                        className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                      </button>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-bold">Service by Process Server — Best overall option.</span> A professional Licensed and Bonded Process Server finds and serves the defendant correctly. This usually costs more, it is the most reliable choice if the defendant may avoid service or if your hearing date is coming up. When you win, your costs may be recoverable. The process server will file the Proof of Service with the court. Make sure you get a stamped copy from the Process Server to bring to court.
                    </p>
                  </div>
                </label>
                {notifyMethod === "process_server" && (
                  <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">e-Filing and Serving Your Small Claims Case With a Licensed Process Server</p>
                        <p className="text-xs text-blue-800 leading-relaxed">After your Small Claims Genie packet is prepared, your case still needs to be filed with the court and served on the defendant. A licensed process server may be able to e-file your case, receive the court-stamped documents, serve the defendant, and file the proof of service with the court if available in your county.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                        <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                          <li>• Your completed Small Claims Genie filing packet with all forms — make sure they are signed by you.</li>
                          <li>• The defendant's full legal name.</li>
                          <li>• The defendant's best address for service.</li>
                          <li>• Any helpful details such as work address, business hours, apartment number, gate code, vehicle description, or photo.</li>
                          <li>• Your contact information and any deadline concerns.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5 space-y-1.5">
                      <p className="text-xs font-semibold text-blue-900">Important</p>
                      <p className="text-xs text-blue-800 leading-relaxed">Filing your case does not mean the defendant has been served. Your hearing may be delayed if the defendant is not served correctly or if the proof of service is not filed before the deadline.</p>
                      <p className="text-xs text-blue-800 leading-relaxed">Small Claims Genie does not file or serve documents for you. A process server or legal support provider may charge separate fees for court filing, e-filing, service attempts, and proof-of-service filing.</p>
                    </div>

                  </div>
                )}

                {/* Radio 2 — Adult Service */}
                <label
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "adult_service" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                  onClick={(e) => { if (notifyMethod === "adult_service") { e.preventDefault(); setNotifyMethod(""); } }}
                >
                  <RadioGroupItem value="adult_service" id="notify-adult" className="mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold">Service by Adult</span> — Reliable low-cost option. Someone 18 or older, who is not part of the case, hands the papers to the defendant. That person must complete Proof of Service (SC-104 – Proof of Service) generated from this system. You file it with the court as soon as possible and bring a stamped copy to your hearing as proof.
                  </p>
                </label>
                {notifyMethod === "adult_service" && (
                  <>
                    {/* Amber Required Card */}
                    <div className="mx-3 mb-2 rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-200 rounded px-1.5 py-0.5">Required</span>
                        <p className="text-xs font-bold text-amber-900">Complete the SC-104 — Proof of Service</p>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">This form must be completed by the person who served the court papers — not you — and filed with the court before your hearing. Open it below, have your server fill it out and sign it, then file it.</p>
                      <Button size="sm" className="h-8 text-xs gap-1.5 px-4 shrink-0 bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white border-0 w-full sm:w-auto"
                        onClick={openSC104InNewTab}
                        disabled={downloadingForm === "sc104"}>
                        {downloadingForm === "sc104" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        Open and Complete the SC-104 — Proof of Service
                      </Button>
                    </div>

                    {/* Blue Instructions Panel */}
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                    <div className="flex gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">You Cannot Serve the Papers Yourself</p>
                        <p className="text-xs text-blue-800 leading-relaxed">The person serving the documents must be at least 18 years old and must not be a party in the case.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4 — How the Third-Party Server Delivered the Papers</p>
                        <p className="text-xs text-blue-800 leading-relaxed">The third-party server fills out only one part of Section 4, depending on how the papers were delivered.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4a — Personal Service</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Use this if the server handed the papers directly to the defendant or to the correct authorized person for the business. The server must enter the date and time of delivery, plus the full address including city, state, and ZIP code.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4b — Substituted Service</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Use this if the server left the papers with another responsible adult instead of handing them directly to the defendant. The server must check the box showing who received the papers, enter the date, time, and address, and write the name or description of the adult who received them.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 5 — Server's Information</p>
                        <p className="text-xs text-blue-800 leading-relaxed">The person serving the documents enters their own name, phone number, address, city, state, and ZIP code.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 6 — Third-Party Server's Signature</p>
                        <p className="text-xs text-blue-800 leading-relaxed">After serving the papers, the third-party server dates, prints their name, and signs the form. Do not complete or sign this section yourself — the person who served the papers must be the one who signs.</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                      <p className="text-xs font-semibold text-blue-900 mb-0.5">After the Server Signs</p>
                      <p className="text-xs text-blue-800 leading-relaxed">File the completed SC-104 with the court as soon as possible. The form must be filed at least <strong>5 days before the hearing</strong>.</p>
                    </div>

                  </div>
                  </>
                )}

                {/* Radio 3 — Certified Mail by Clerk (lowest-cost option) */}
                <label
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                  onClick={(e) => { if (notifyMethod === "certified_mail") { e.preventDefault(); setNotifyMethod(""); } }}
                >
                  <RadioGroupItem value="certified_mail" id="notify-mail" className="mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold">Court Clerk Sends by Certified Mail</span> — Lowest-cost, <span className="font-bold">least reliable option</span>. Ask the clerk for certified-mail service when you file at court. The clerk handles the mailing, so no extra service papers are needed. Service only counts if the defendant signs for delivery. If the defendant refuses, ignores, or does not sign for the mail, service fails and the deadline does not restart. If Service by Clerk is refused by defendant, you can still follow-up and implement these services for reliability.
                  </p>
                </label>

                {/* Conditional guidance box — certified mail selected */}
                {notifyMethod === "certified_mail" && (
                  <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">At the Filing Window</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Ask the clerk to send the defendant your claim by certified mail. Some courts require a local request form and a small certified-mail fee — ask the clerk whether anything else is needed before leaving the filing window.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Do not assume the defendant has been served just because the clerk mailed the papers. Service is only complete if the certified-mail receipt is signed by the defendant and the court accepts it as valid proof.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Status 10–14 Days After Filing</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Look up your case online using your case number, or contact the clerk to confirm whether the signed receipt came back and was accepted by the court.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                        <p className="text-xs text-blue-800 leading-relaxed mb-1">Service fails if the defendant refused delivery, ignored the postal notice, someone else signed in a way the court doesn't accept, or the mail was returned. Your case is <strong>not dismissed</strong> — you do not need to start over.</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Switch to another method quickly: personal service by an adult not involved in your case, sheriff service, or a registered process server.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Watch the Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">The defendant must be served at least <strong>15 days before the hearing</strong> if they are in the same county, or <strong>20 days before</strong> if they are outside the county. A failed certified mail attempt does <strong>not</strong> restart that deadline.</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Not Enough Time? Request a Postponement</p>
                        <p className="text-xs text-blue-800 leading-relaxed">If the hearing date is too close to complete service, file <strong>SC-150 (Request to Postpone Trial)</strong> — available in the optional forms section below. File at least 10 days before the hearing when possible.</p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                      <p className="text-xs font-semibold text-blue-900 mb-0.5">Recommended Next Step</p>
                      <p className="text-xs text-blue-800 leading-relaxed">Check the case status with the clerk as soon as possible after the mailing attempt. If no signed receipt is on file, don't wait — switch to a more reliable service method and request a postponement if the hearing date is too close.</p>
                    </div>

                  </div>
                )}

              </RadioGroup>
            </div>
            {commonWarnings}
            {commonRelated}
          </div>
        );

      case "sc100a":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              File alongside your SC-100 if your case has more than two parties.
              {currentCase.hasAdditionalPlaintiff && currentCase.additionalPlaintiffName
                ? ` ${currentCase.additionalPlaintiffName}'s information is pre-filled from your intake.`
                : " Add additional plaintiffs or defendants not listed on your SC-100."}
            </p>
            {commonWarnings}
            {commonRelated}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={viewSC100A} disabled={viewingPdf || downloadingForm === "sc100a"}>
                {viewingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View My SC-100A Other Parties
              </Button>
              <Button size="sm" className="gap-1.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white h-8 text-xs px-3"
                onClick={() => {
                  setSc100aFormBody({ signDate: new Date().toISOString().split("T")[0], extraDefendant: null, extraPlaintiff: null });
                  setSc100aSigModalOpen(true);
                }}
                disabled={downloadingForm === "sc100a" || viewingPdf}>
                {downloadingForm === "sc100a" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download SC-100A
              </Button>
            </div>
          </div>
        );

      case "sc104": {
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              SC-104 is a Proof of Service. Some fields must be completed by the person who serves the papers after service is completed. Your case information is pre-filled — click below to open the form, fill in the server&apos;s details directly on the PDF, then save or print it.
            </p>
            {commonWarnings}
            {commonRelated}

            <button
              type="button"
              onClick={openSC104InNewTab}
              disabled={downloadingForm === "sc104"}
              className="w-full flex items-center justify-between rounded-lg border-2 border-[#0d6b5e]/40 bg-[#0d6b5e]/5 px-4 py-3 text-sm font-semibold text-[#0d6b5e] hover:bg-[#0d6b5e]/10 transition-colors disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {downloadingForm === "sc104" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Open SC-104 PDF
              </span>
              <span className="flex items-center gap-1.5 text-xs font-normal text-[#0d6b5e]/70">
                Opens in a new tab
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="gap-1.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white h-8 text-xs px-3"
                onClick={() => setSc104SigModalOpen(true)}
                disabled={downloadingForm === "sc104"}>
                {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}
                Sign &amp; Download SC-104
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 px-3"
                onClick={() => downloadSignedSC104(undefined, sc104Fields)}
                disabled={downloadingForm === "sc104"}>
                {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Download Without Signature
              </Button>
            </div>
          </div>
        );
      }

      case "fw001": {
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your name, address, and case information are pre-filled from your intake. Fill in the remaining fields directly on the form, then use the save button in the PDF viewer to download your completed copy.
            </p>
            {commonWarnings}

            {!fw001BlobUrl && (
              <Button
                size="sm"
                className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                disabled={fw001Loading}
                onClick={() => {
                  if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
                  setFw001SigModalOpen(true);
                }}
              >
                {fw001Loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                Sign &amp; Open FW-001
              </Button>
            )}

            {fw001BlobUrl && (
              <div className="space-y-2">
                <iframe
                  src={fw001BlobUrl}
                  title="FW-001 Request to Waive Court Fees"
                  className="w-full rounded border border-border"
                  style={{ height: "880px", minHeight: "600px" }}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fill in the fields above, then click the <span className="font-medium">save / download icon</span> inside the PDF viewer to save your completed form.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-xs px-3"
                    onClick={async () => {
                      if (isDraftMode) { toast({ title: "Subscribe to Download", description: "Start your subscription to download court forms." }); return; }
                      try {
                        const clerkToken = await getToken();
                        const dlRes = await fetch(`/api/cases/${caseId}/forms/fw001/interactive`, {
                          headers: { Authorization: `Bearer ${clerkToken}` },
                        });
                        if (!dlRes.ok) { toast({ title: "Error", description: "Could not download FW-001." }); return; }
                        const blob = await dlRes.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `FW001-Case-${caseId}.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        toast({ title: "Error", description: "Could not download FW-001." });
                      }
                    }}
                  >
                    <FileText className="h-3 w-3" />
                    Download Pre-filled Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-8 text-xs px-3 text-muted-foreground"
                    onClick={() => { URL.revokeObjectURL(fw001BlobUrl); setFw001BlobUrl(null); }}
                  >
                    Close Viewer
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. File it at the clerk's window before or at the same time as your SC-100.
              </p>
            </div>

            {commonRelated}
          </div>
        );
      }

      case "sc103":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Required if you are filing under a business trade name (DBA). Your DBA information from intake is pre-filled automatically.
            </p>
            {commonWarnings}
            {commonRelated}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={viewSC103} disabled={viewingPdf || downloadingForm === "sc103"}>
                {viewingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View My SC-103 Fictitious Name
              </Button>
              <Button size="sm" className="gap-1.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white h-8 text-xs px-3"
                onClick={() => setSc103SigModalOpen(true)}
                disabled={downloadingForm === "sc103" || viewingPdf}>
                {downloadingForm === "sc103" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download SC-103
              </Button>
            </div>
          </div>
        );

      case "sc103b":
        return (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Required because the additional plaintiff operates under a fictitious business name (DBA). Their DBA information from intake is pre-filled automatically.
            </p>
            {commonWarnings}
            {commonRelated}
            <div className="flex gap-2 flex-wrap pt-1">
              <Button size="sm" className="gap-1.5 bg-[#14b8a6] hover:bg-[#0d9488] text-white h-8 text-xs px-3"
                onClick={() => setSc103bSigModalOpen(true)}
                disabled={downloadingForm === "sc103b"}>
                {downloadingForm === "sc103b" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download SC-103 (Plaintiff 2)
              </Button>
            </div>
          </div>
        );

      default: {
        const hasFieldConfig = !!FORM_FIELD_CONFIG[currentStep.id];
        return (
          <div className="space-y-3">
            {commonWarnings}
            {commonRelated}
            <div className="flex gap-2 flex-wrap pt-1">
              {hasFieldConfig ? (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3"
                  onClick={() => { setModalInitialValues(getInitialValues(currentStep.id)); setModalFormId(currentStep.id); }}
                  disabled={downloadingForm === currentStep.id}>
                  {downloadingForm === currentStep.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  Fill Out &amp; Download {currentStep.number}
                </Button>
              ) : catalogCurrentForm?.blankFormUrl ? (
                <a href={catalogCurrentForm.blankFormUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3">
                    <Download className="h-3 w-3" />Download Blank PDF
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        );
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const isFloridaCase = currentCase.jurisdictionState === "FL";
  const isTexasCase = currentCase.jurisdictionState === "TX";
  const isIllinoisCase = currentCase.jurisdictionState === "IL";
  const isNorthCarolinaCase = (currentCase.jurisdictionState as string) === "NC";
  const isVirginiaCase = (currentCase.jurisdictionState as string) === "VA";
  const isNewJerseyCase = (currentCase.jurisdictionState as string) === "NJ";
  const isWashingtonCase = (currentCase.jurisdictionState as string) === "WA";

  return (
    <div className="pt-3 pb-4 md:pb-6 space-y-4 px-4 md:px-6">

      {isDraftMode && <DraftModeBanner />}

      {/* FL forms section */}
      {isFloridaCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h3 className="text-base font-bold text-foreground">Florida Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={FL_WIZARD_STEPS}
            currentIndex={flWizardIndex}
            onStepClick={setFlWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: Statement of Claim ──────────────────────────────────── */}
          {flWizardIndex === 0 && (
            <div className="space-y-3">

              {currentCase.countyId === "fl-miami-dade" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    File with the Miami-Dade County Court Clerk — 73 W. Flagler St., Suite 133, Miami.
                  </p>
                  <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CLK/CT. 333</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                      </div>
                      <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                      {downloadError && downloadingForm === "fl/clkct333" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <button type="button" disabled={downloadingForm === "fl/clkct333/signed"} onClick={() => openFlSigModal({ endpoint: "fl/clkct333", filename: `Statement-of-Claim-Miami-Dade-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                        {downloadingForm === "fl/clkct333/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                        Sign &amp; Download
                      </button>
                      <button type="button" disabled={downloadingForm === "fl/clkct333"} onClick={() => downloadSignedFLForm("fl/clkct333", `Statement-of-Claim-Miami-Dade-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                        {downloadingForm === "fl/clkct333" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                        Skip signing
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-volusia" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with the Volusia County Court Clerk — 101 N. Alabama Ave., DeLand.</p>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CL-219</span>
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                        </div>
                        <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <button type="button" disabled={downloadingForm === "fl/cl219-volusia-pdf/signed"} onClick={() => openFlSigModal({ endpoint: "fl/cl219-volusia-pdf", filename: `Statement-of-Claim-Volusia-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/cl219-volusia-pdf/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                          Sign &amp; Download
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/cl219-volusia-pdf"} onClick={() => downloadSignedFLForm("fl/cl219-volusia-pdf", `Statement-of-Claim-Volusia-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/cl219-volusia-pdf" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip signing
                        </button>
                      </div>
                    </div>
                    {downloadError && (downloadingForm === "fl/cl219-volusia-pdf" || downloadingForm === "fl/cl219-volusia") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={downloadingForm === "fl/cl219-volusia/signed"} onClick={() => openFlSigModal({ endpoint: "fl/cl219-volusia", filename: `Statement-of-Claim-Volusia-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/cl219-volusia/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                          Sign alternate
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/cl219-volusia"} onClick={() => downloadSignedFLForm("fl/cl219-volusia", `Statement-of-Claim-Volusia-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/cl219-volusia" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-broward" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with the Broward County Clerk of Courts — 201 SE 6th St., Room 01250, Fort Lauderdale.</p>
                  <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                      </div>
                      <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and Broward County Court header.</p>
                      {downloadError && downloadingForm === "fl/broward" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <button type="button" disabled={downloadingForm === "fl/broward/signed"} onClick={() => openFlSigModal({ endpoint: "fl/broward", filename: `Statement-of-Claim-Broward-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                        {downloadingForm === "fl/broward/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                        Sign &amp; Download
                      </button>
                      <button type="button" disabled={downloadingForm === "fl/broward"} onClick={() => downloadSignedFLForm("fl/broward", `Statement-of-Claim-Broward-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                        {downloadingForm === "fl/broward" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                        Skip signing
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-orange" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with the Orange County Clerk of Courts — 425 N. Orange Ave., Suite 100, Orlando.</p>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                        </div>
                        <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <button type="button" disabled={downloadingForm === "fl/plain-soc-orange/signed"} onClick={() => openFlSigModal({ endpoint: "fl/plain-soc-orange", filename: `Statement-of-Claim-Orange-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/plain-soc-orange/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                          Sign &amp; Download
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/plain-soc-orange"} onClick={() => downloadSignedFLForm("fl/plain-soc-orange", `Statement-of-Claim-Orange-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/plain-soc-orange" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip signing
                        </button>
                      </div>
                    </div>
                    {downloadError && (downloadingForm === "fl/plain-soc-orange" || downloadingForm === "fl/orange") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={downloadingForm === "fl/orange/signed"} onClick={() => openFlSigModal({ endpoint: "fl/orange", filename: `Statement-of-Claim-Orange-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/orange/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                          Sign alternate
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/orange"} onClick={() => downloadSignedFLForm("fl/orange", `Statement-of-Claim-Orange-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/orange" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-hillsborough" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with the Hillsborough County Clerk of Courts — 800 E. Twiggs St., Tampa.</p>
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                        </div>
                        <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                        <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled from your case details.</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <button type="button" disabled={downloadingForm === "fl/soc-hillsborough/signed"} onClick={() => openFlSigModal({ endpoint: "fl/soc-hillsborough", filename: `Statement-of-Claim-Hillsborough-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/soc-hillsborough/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                          Sign &amp; Download
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/soc-hillsborough"} onClick={() => downloadSignedFLForm("fl/soc-hillsborough", `Statement-of-Claim-Hillsborough-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/soc-hillsborough" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip signing
                        </button>
                      </div>
                    </div>
                    {downloadError && (downloadingForm === "fl/soc-hillsborough" || downloadingForm === "fl/hillsborough") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    <div className="mt-2 pt-2 border-t flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Prefer the standard layout? Use the programmatic version.</p>
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={downloadingForm === "fl/hillsborough/signed"} onClick={() => openFlSigModal({ endpoint: "fl/hillsborough", filename: `Statement-of-Claim-Hillsborough-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/hillsborough/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3 w-3" />}
                          Sign alternate
                        </button>
                        <button type="button" disabled={downloadingForm === "fl/hillsborough"} onClick={() => downloadSignedFLForm("fl/hillsborough", `Statement-of-Claim-Hillsborough-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                          {downloadingForm === "fl/hillsborough" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                          Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-palm-beach" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with the Palm Beach County Clerk &amp; Comptroller — 205 N. Dixie Hwy., West Palm Beach.</p>
                  <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                      </div>
                      <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and Palm Beach County Court header.</p>
                      {downloadError && downloadingForm === "fl/palm-beach" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <button type="button" disabled={downloadingForm === "fl/palm-beach/signed"} onClick={() => openFlSigModal({ endpoint: "fl/palm-beach", filename: `Statement-of-Claim-Palm-Beach-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                        {downloadingForm === "fl/palm-beach/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                        Sign &amp; Download
                      </button>
                      <button type="button" disabled={downloadingForm === "fl/palm-beach"} onClick={() => downloadSignedFLForm("fl/palm-beach", `Statement-of-Claim-Palm-Beach-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                        {downloadingForm === "fl/palm-beach" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                        Skip signing
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentCase.countyId !== "fl-miami-dade" && currentCase.countyId !== "fl-volusia" && currentCase.countyId !== "fl-broward" && currentCase.countyId !== "fl-orange" && currentCase.countyId !== "fl-hillsborough" && currentCase.countyId !== "fl-palm-beach" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">File with your county clerk. Check your county's clerk website for the filing address and any local instructions.</p>
                  <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                      </div>
                      <p className="text-base font-bold leading-snug text-foreground">Statement of Claim</p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">Initiates your small claims case. Pre-filled with your case details and county court header.</p>
                      {downloadError && downloadingForm === "fl/statement-of-claim" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <button type="button" disabled={downloadingForm === "fl/statement-of-claim/signed"} onClick={() => openFlSigModal({ endpoint: "fl/statement-of-claim", filename: `Florida-Statement-of-Claim-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                        {downloadingForm === "fl/statement-of-claim/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                        Sign &amp; Download
                      </button>
                      <button type="button" disabled={downloadingForm === "fl/statement-of-claim"} onClick={() => downloadSignedFLForm("fl/statement-of-claim", `Florida-Statement-of-Claim-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                        {downloadingForm === "fl/statement-of-claim" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                        Skip signing
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filing fee recoverability notice — always visible in FL step 0 */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-base font-bold text-foreground mb-0.5">Florida Filing Fees — Fla. Stat. § 28.241</p>
                <p className="text-base font-bold text-foreground mb-1">Filing fees are recoverable as court costs when you win your case — Fla. Stat. § 57.041.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">$0 – $100</span><span className="font-medium text-blue-900">$55</span>
                  <span className="text-blue-700">$101 – $500</span><span className="font-medium text-blue-900">$80</span>
                  <span className="text-blue-700">$501 – $2,500</span><span className="font-medium text-blue-900">$175</span>
                  <span className="text-blue-700">$2,501 – $5,000</span><span className="font-medium text-blue-900">$300</span>
                  <span className="text-blue-700">$5,001 – $8,000</span><span className="font-medium text-blue-900">$395</span>
                </div>
                <p className="text-xs text-blue-800">Claim limit: $8,000. Fees may vary slightly by county — confirm with your clerk. A fee waiver is available if you cannot afford the filing fee (see the Fee Waiver step).</p>
              </div>

            </div>
          )}

          {/* ── Step 1: Summons / Notice to Appear ─────────────────────────────── */}
          {flWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">Bring this form to the clerk when you file your Statement of Claim. The clerk assigns the case number, hearing date, and courtroom, then issues the summons to the defendant.</p>

              {currentCase.countyId === "fl-miami-dade" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">CLK/CT. 423</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/clkct423" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/clkct423/signed"} onClick={() => openFlSigModal({ endpoint: "fl/clkct423", filename: `Summons-Miami-Dade-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/clkct423/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/clkct423"} onClick={() => downloadSignedFLForm("fl/clkct423", `Summons-Miami-Dade-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/clkct423" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-volusia" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/volusia-summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/volusia-summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/volusia-summons", filename: `Summons-Volusia-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/volusia-summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/volusia-summons"} onClick={() => downloadSignedFLForm("fl/volusia-summons", `Summons-Volusia-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/volusia-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-broward" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/broward-summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/broward-summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/broward-summons", filename: `Summons-Broward-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/broward-summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/broward-summons"} onClick={() => downloadSignedFLForm("fl/broward-summons", `Summons-Broward-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/broward-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-orange" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/orange-summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/orange-summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/orange-summons", filename: `Summons-Orange-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/orange-summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/orange-summons"} onClick={() => downloadSignedFLForm("fl/orange-summons", `Summons-Orange-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/orange-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-hillsborough" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/hillsborough-summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/hillsborough-summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/hillsborough-summons", filename: `Summons-Hillsborough-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/hillsborough-summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/hillsborough-summons"} onClick={() => downloadSignedFLForm("fl/hillsborough-summons", `Summons-Hillsborough-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/hillsborough-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId === "fl-palm-beach" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/palm-beach-summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/palm-beach-summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/palm-beach-summons", filename: `Summons-Palm-Beach-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/palm-beach-summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/palm-beach-summons"} onClick={() => downloadSignedFLForm("fl/palm-beach-summons", `Summons-Palm-Beach-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/palm-beach-summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

              {currentCase.countyId !== "fl-miami-dade" && currentCase.countyId !== "fl-volusia" && currentCase.countyId !== "fl-broward" && currentCase.countyId !== "fl-orange" && currentCase.countyId !== "fl-hillsborough" && currentCase.countyId !== "fl-palm-beach" && (
                <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.322</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes</span>
                    </div>
                    <p className="text-base font-bold leading-snug text-foreground">Summons / Notice to Appear</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk — they will assign the case number, hearing date, and courtroom, then issue it to the defendant.</p>
                    {downloadError && downloadingForm === "fl/summons" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <button type="button" disabled={downloadingForm === "fl/summons/signed"} onClick={() => openFlSigModal({ endpoint: "fl/summons", filename: `Florida-Summons-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {downloadingForm === "fl/summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                      Sign &amp; Download
                    </button>
                    <button type="button" disabled={downloadingForm === "fl/summons"} onClick={() => downloadSignedFLForm("fl/summons", `Florida-Summons-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                      {downloadingForm === "fl/summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                      Skip signing
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {flWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After the clerk signs and stamps your summons, you must have it served on the defendant before the pretrial conference date shown on the summons. You have up to <strong>120 days from filing</strong> to complete service before the court may dismiss your case (Fla. R. Civ. P. 1.070). Serve early — sheriff and certified mail service can take weeks. Choose the method that works best for your situation.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={flServiceMethod} onValueChange={setFlServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${flServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (flServiceMethod === "process_server") { e.preventDefault(); setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="fl-serve-ps" className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}/efile`); }}
                          className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">Certified Process Server</span> — A certified process server (licensed under Fla. Stat. § 48.27) personally serves the summons and Statement of Claim on the defendant. Best option if the defendant may avoid service or your hearing date is approaching. Fees may be recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {flServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues and stamps your summons, bring or mail it to a certified process server. The server locates the defendant, personally delivers the summons and Statement of Claim, and files a Return of Service directly with the court.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The clerk-issued, signed summons and a copy of your Statement of Claim.</li>
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• Your contact information and any hearing date concerns.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed before the pretrial conference date on the summons. You have 120 days from filing before the court may dismiss for lack of service. Process server fees may be recovered if you win.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${flServiceMethod === "sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (flServiceMethod === "sheriff") { e.preventDefault(); setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="sheriff" id="fl-serve-sheriff" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Sheriff Service</span> — Contact your county sheriff's civil division to request service. The sheriff serves the defendant and files a Return of Service with the court. More affordable than a private process server, but may take longer to complete.
                    </p>
                  </label>
                  {flServiceMethod === "sheriff" && (
                    <>
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How to Request Sheriff Service</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues your summons, contact the civil division of your county sheriff's office. Bring or mail the clerk-issued summons, a copy of the Statement of Claim, the defendant's address, and the service fee (varies by county, typically $40–$100).</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Status Early</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Contact the sheriff's office 10–14 days after submission to confirm service was completed. If the defendant cannot be found, you may need to provide an updated address or switch to a certified process server.</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed before the pretrial conference date on the summons. Allow extra time — sheriff service can take 1–3 weeks depending on the county. You have 120 days from filing before the court may dismiss.</p>
                      </div>
                    </div>
                    <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">Form 7.340</span>
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Return of Service</span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">Florida Return of Service</p>
                        <p className="text-xs text-muted-foreground mt-0.5">After the sheriff serves the defendant, they complete and file this Return of Service with the court. Download a copy to keep for your records and to confirm service was completed before your pretrial conference.</p>
                        {downloadError && downloadingForm === "fl/proof-of-service" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                      </div>
                      <div className="shrink-0">
                        <button type="button" disabled={downloadingForm === "fl/proof-of-service"} onClick={() => downloadSignedFLForm("fl/proof-of-service", `FL-Return-of-Service-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                          {downloadingForm === "fl/proof-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                          Download
                        </button>
                      </div>
                    </div>
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${flServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (flServiceMethod === "certified_mail") { e.preventDefault(); setFlServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="fl-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> Available for <strong>Florida residents only</strong> (Fla. Sm. Cl. R. 7.070). The clerk sends the summons and Statement of Claim by certified mail. Service is valid only if the defendant — or someone authorized to receive mail at their residence or business — signs the return receipt. Not valid for out-of-state defendants.
                    </p>
                  </label>
                  {flServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                          <p className="text-xs text-blue-800 leading-relaxed">If the defendant refuses, ignores, or does not sign for the certified mail, service fails and your hearing may be postponed. Your case is not dismissed — you can switch to a different service method.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Switch to a certified process server or sheriff service right away. A failed mail attempt does not reset your hearing deadline — contact the clerk to request a continuance if the date is too close.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {flWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Application for Civil Indigent Status</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case number are pre-filled. Print the form, hand-complete the financial eligibility section (income, assets, and debts), sign it, and file with the clerk at the same time as your Statement of Claim.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Application for Civil Indigent Status</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  {downloadError && (downloadingForm === "fl/fee-waiver" || downloadingForm === "fl/fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "fl/fee-waiver/signed"} onClick={() => openFlSigModal({ endpoint: "fl/fee-waiver", filename: `FL-Fee-Waiver-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "fl/fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "fl/fee-waiver"} onClick={() => downloadSignedFLForm("fl/fee-waiver", `FL-Fee-Waiver-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "fl/fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window before or at the same time as your Statement of Claim.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={flWizardIndex === 0} onClick={() => setFlWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={flWizardIndex === FL_WIZARD_STEPS.length - 1} onClick={() => setFlWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
      )}


      {/* TX forms section */}
      {isTexasCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h3 className="text-base font-bold text-foreground">Texas Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={TX_WIZARD_STEPS}
            currentIndex={txWizardIndex}
            onStepClick={setTxWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: TX Petition ────────────────────────────────────────────── */}
          {txWizardIndex === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File with the Justice of the Peace court in the precinct where the defendant lives or where the transaction occurred. The petition below is pre-filled with your case information.
              </p>

              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Small Claims Petition</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled petition to open your case in Texas JP court. File this with the justice court clerk in your precinct.</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => downloadSignedFLForm("tx/petition", `TX-Small-Claims-Petition-Case-${caseId}.pdf`)}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button size="sm" className="gap-1.5 h-8 text-xs bg-[#0d6b5e] hover:bg-[#0a5449] text-white" onClick={() => openFlSigModal({ endpoint: "tx/petition", filename: `TX-Small-Claims-Petition-Case-${caseId}-signed.pdf` })}>
                    <PenLine className="h-3.5 w-3.5" /> Sign &amp; Download
                  </Button>
                </div>
              </div>

              {/* Filing steps */}
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Filing in Texas — Next Steps</p>
                {(() => {
                  const countyId = currentCase.countyId ?? "";
                  const precinct = TX_JP_PRECINCTS[countyId];
                  return precinct ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 mb-1">
                      <p className="text-xs font-semibold text-emerald-800 mb-0.5">Your JP Court — Precinct 1, Place 1</p>
                      <p className="text-xs text-emerald-700">{precinct.address}, {precinct.city}, TX {precinct.zip}</p>
                    </div>
                  ) : null;
                })()}
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Print the petition and bring it to the Justice of the Peace court in the correct precinct.</li>
                  <li>File in the precinct where the defendant lives, or where the contract or incident occurred.</li>
                  <li>Pay the filing fee at the clerk's window (see fee schedule below). Ask about fee waivers if needed.</li>
                  <li>The court will issue a Citation (summons) — served by constable, sheriff, or process server.</li>
                  <li>Your trial date will be set — typically 20–45 days after service.</li>
                </ol>
              </div>

              {/* Fee schedule */}
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-base font-bold text-foreground mb-1">Texas Filing Fees — Tex. Gov't Code § 118.121</p>
                <p className="text-base font-bold text-foreground mb-2">Filing fees are recoverable as court costs when you win your case — Tex. R. Civ. P. 131.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <span className="text-muted-foreground">$0 – $200</span><span className="font-medium text-foreground">$46</span>
                  <span className="text-muted-foreground">$201 – $500</span><span className="font-medium text-foreground">$71</span>
                  <span className="text-muted-foreground">$501 – $1,000</span><span className="font-medium text-foreground">$121</span>
                  <span className="text-muted-foreground">$1,001 – $5,000</span><span className="font-medium text-foreground">$221</span>
                  <span className="text-muted-foreground">$5,001 – $10,000</span><span className="font-medium text-foreground">$271</span>
                  <span className="text-muted-foreground">$10,001 – $20,000</span><span className="font-medium text-foreground">$321</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Claim limit: $20,000 (exclusive of attorneys' fees, interest, and court costs)</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Citation ───────────────────────────────────────────────── */}
          {txWizardIndex === 1 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Citation (Court-Issued Summons)</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After you file your petition and pay the filing fee, the court prepares a Citation — the official notice to the defendant. Download this pre-filled Citation to bring to the clerk at filing. The clerk will stamp it and forward it for service.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Citation</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details. Bring to the clerk when you file — the clerk signs, stamps, and forwards it for service on the defendant.</p>
                  {downloadError && downloadingForm === "tx/citation" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "tx/citation"} onClick={() => downloadSignedFLForm("tx/citation", `TX-Citation-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "tx/citation" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {txWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After you file and pay the filing fee, the clerk issues a Citation (summons) for you to have served on the defendant. Once served, the defendant has <strong>14 days to file an answer</strong> (TRCP Rule 502). The court then schedules trial <strong>20–45 days after service</strong> (TRCP Rule 503). Serve as early as possible — the hearing date is not set until after the answer period closes.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={txServiceMethod} onValueChange={setTxServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "process_server") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="tx-serve-ps" className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}/efile`); }}
                          className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">Private Process Server</span> — A licensed Texas process server picks up the citation from the clerk and personally serves the defendant. More expensive but most reliable if the defendant may avoid service. Fees are recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {txServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After filing, ask the clerk to prepare the Citation. A licensed process server picks it up from the court, locates and personally serves the defendant, and files a Return of Service directly with the court when complete.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• Your contact information and any hearing date concerns.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Timing</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Once the defendant is served, they have <strong>14 days to file an answer</strong>. The court schedules trial 20–45 days after service. Serve early so there is time to resolve service issues before your case is heard. Service fees are typically recoverable if you win.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "constable_sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "constable_sheriff") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="constable_sheriff" id="tx-serve-constable" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Constable / Sheriff Service</span> — Standard option. Request constable or sheriff service at the clerk's window when you file. The court forwards the citation to the constable's or sheriff's office, which attempts service and files a Return of Service when complete.
                    </p>
                  </label>
                  {txServiceMethod === "constable_sheriff" && (
                    <>
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">At the Filing Window</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Tell the clerk you want constable or sheriff service. There is usually a small service fee (around $75–$100 depending on the county). The constable will attempt service at the defendant's address on file.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Your Case Status</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Follow up with the clerk 10–14 days after filing to confirm the Return of Service has been filed. If service was unsuccessful, you may need to switch to a private process server or provide an updated address.</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Timing</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Once the defendant is served, they have <strong>14 days to file an answer</strong>. The court then schedules trial 20–45 days after service. Serve early — if service fails, you will need to make another attempt before the court can proceed.</p>
                      </div>
                    </div>
                    {currentCase.countyId === "tx-denton" && (
                      <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Constable / Sheriff Service</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">Denton County Citation Request</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Official Denton County Justice Court form to request sheriff service of your citation. Pre-filled with your case info and the Denton County Sheriff's Office address. Enter your JP court precinct number after opening, then submit to the clerk with your filing fee.</p>
                          {downloadError && downloadingForm === "tx/denton-citation-request" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            disabled={downloadingForm === "tx/denton-citation-request"}
                            onClick={() => downloadSignedFLForm("tx/denton-citation-request", `TX-Denton-Citation-Request-Case-${caseId}.pdf`)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {downloadingForm === "tx/denton-citation-request" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                            Open
                          </button>
                        </div>
                      </div>
                    )}
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${txServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (txServiceMethod === "certified_mail") { e.preventDefault(); setTxServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="tx-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> Available in some Texas JP courts. The clerk sends the citation by certified mail. Service only counts if the defendant personally signs for it.
                    </p>
                  </label>
                  {txServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Return Receipt Required (TRCP Rule 501)</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Must be sent restricted delivery. Service is complete only upon the court receiving a signed or electronic return receipt. If the defendant refuses or does not accept delivery, service fails.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Switch to constable/sheriff service or a certified process server right away. The answer deadline does not restart — serve early to leave time for a second attempt if needed.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Return of Service</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Texas Return of Service</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Give this blank form to your process server or constable. They complete and file it with the court after serving the defendant.</p>
                  {downloadError && downloadingForm === "tx/return-of-service" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={downloadingForm === "tx/return-of-service"} onClick={() => downloadSignedFLForm("tx/return-of-service", `TX-Return-of-Service-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "tx/return-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {txWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Affidavit of Inability to Pay</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case information are pre-filled from your intake. Download the form, complete the financial eligibility section, sign it, and file it with the clerk at the same time as your petition.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Affidavit of Inability to Pay</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  <p className="text-xs text-muted-foreground mt-1">Editable fields require Adobe Acrobat.</p>
                  {downloadError && (downloadingForm === "tx/fee-waiver" || downloadingForm === "tx/fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "tx/fee-waiver/signed"} onClick={() => openFlSigModal({ endpoint: "tx/fee-waiver", filename: `TX-Fee-Waiver-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "tx/fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "tx/fee-waiver"} onClick={() => downloadSignedFLForm("tx/fee-waiver", `TX-Fee-Waiver-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "tx/fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window at the same time as your petition.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={txWizardIndex === 0} onClick={() => setTxWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={txWizardIndex === TX_WIZARD_STEPS.length - 1} onClick={() => setTxWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
      )}


      {/* IL forms section */}
      {isIllinoisCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌟</span>
            <h3 className="text-base font-bold text-foreground">Illinois Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={IL_WIZARD_STEPS}
            currentIndex={ilWizardIndex}
            onStepClick={setIlWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: Small Claims Complaint ─────────────────────────────────── */}
          {ilWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this standardized complaint form with your county Circuit Court clerk. Illinois uses a uniform statewide small claims complaint (735 ILCS 5/2-209 et seq.). Claim limit: $10,000.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Small Claims Complaint</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Illinois Supreme Court uniform form — accepted at every Illinois Circuit Court. Pre-filled from your case details.</p>
                  {downloadError && (downloadingForm === "il/smc-complaint" || downloadingForm === "il/smc-complaint/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "il/smc-complaint/signed"} onClick={() => openFlSigModal({ endpoint: "il/smc-complaint", filename: `IL-Small-Claims-Complaint-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "il/smc-complaint/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "il/smc-complaint"} onClick={() => downloadSignedFLForm("il/smc-complaint", `IL-Small-Claims-Complaint-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "il/smc-complaint" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">Illinois Filing Fees</p>
                <p className="text-base font-bold text-foreground mb-1">Filing fees are recoverable as court costs when you win your case — 735 ILCS 5/5-108.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">$0 – $250</span><span className="font-medium text-blue-900">$54</span>
                  <span className="text-blue-700">$251 – $1,000</span><span className="font-medium text-blue-900">$77</span>
                  <span className="text-blue-700">$1,001 – $2,500</span><span className="font-medium text-blue-900">$132</span>
                  <span className="text-blue-700">$2,501 – $10,000</span><span className="font-medium text-blue-900">$221</span>
                </div>
                <p className="text-xs text-blue-800">Claim limit: $10,000. Fees vary slightly by county — check with your Circuit Court clerk. A fee waiver is available if you cannot afford the filing fee (see the Fee Waiver step).</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Summons ────────────────────────────────────────────────── */}
          {ilWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this summons with your complaint. The clerk assigns the return date (hearing date) and issues the summons — you then have it served on the defendant before the return date.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Summons — Small Claims</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk when you file your Complaint — the clerk assigns the return date and signs it.</p>
                  {downloadError && (downloadingForm === "il/summons" || downloadingForm === "il/summons/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "il/summons/signed"} onClick={() => openFlSigModal({ endpoint: "il/summons", filename: `IL-Summons-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "il/summons/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "il/summons"} onClick={() => downloadSignedFLForm("il/summons", `IL-Summons-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "il/summons" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800 leading-relaxed"><strong>Important:</strong> The clerk sets the return date <strong>21–40 days after the summons is issued</strong>. The defendant must be served at least <strong>3 days before that return date</strong>. The process server must be at least 18 years old and not a party to the case.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Serve Defendant ─────────────────────────────────────────── */}
          {ilWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Serving the Defendant</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After the clerk issues the summons, you must have it served on the defendant. The clerk sets a return date <strong>21–40 days after the summons is issued</strong>. Illinois requires service at least <strong>3 days before the return date</strong>. The process server must be at least 18 years old and not a party to the case.
              </p>
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={ilServiceMethod} onValueChange={setIlServiceMethod} className="gap-0">

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ilServiceMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ilServiceMethod === "process_server") { e.preventDefault(); setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="process_server" id="il-serve-ps" className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}/efile`); }}
                          className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">Private Process Server</span> — A licensed Illinois process server personally delivers the summons and complaint to the defendant. Best option if the defendant may avoid service. Fees may be recoverable if you win.
                      </p>
                    </div>
                  </label>
                  {ilServiceMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">How It Works</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After the clerk issues the summons, give it to a <strong>licensed private detective / process server</strong> along with a copy of the complaint (735 ILCS 5/2-202). A licensed server can serve without court appointment in all Illinois counties (including Cook County as of January 1, 2025). The server personally delivers both documents to the defendant and files a Proof of Service with the court.</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• The clerk-issued summons and a copy of your Complaint.</li>
                            <li>• The defendant's full legal name and best address for service.</li>
                            <li>• Any additional details: work address, business hours, vehicle description, or photo.</li>
                            <li>• The return date — service must be completed at least 3 days before.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Deadline</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Service must be completed at least <strong>3 days before the return date</strong>. Process server fees may be recovered if you win your case.</p>
                      </div>
                    </div>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ilServiceMethod === "sheriff" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ilServiceMethod === "sheriff") { e.preventDefault(); setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="sheriff" id="il-serve-sheriff" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Sheriff Service</span> — Contact your county sheriff's civil division to arrange service. The sheriff serves the defendant and files a Return of Service with the court. More affordable but may take longer.
                    </p>
                  </label>
                  {ilServiceMethod === "sheriff" && (
                    <>
                      <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                        <div className="flex gap-2.5">
                          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-0.5">How to Request Sheriff Service</p>
                            <p className="text-xs text-blue-800 leading-relaxed">Download the Letter to the Sheriff below. Mail it to your county sheriff's civil division with 3 copies of the summons, 1 copy of the complaint, a self-addressed stamped envelope, and the service fee (typically $60). The sheriff will mail you back the completed Proof of Service.</p>
                          </div>
                        </div>
                        <div className="flex gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-900 mb-0.5">Allow Extra Time</p>
                            <p className="text-xs text-blue-800 leading-relaxed">Sheriff service can take 1–2 weeks. Given the 3-day minimum requirement before the return date, start this process as soon as you file. If the return date is too close, request a continuance from the clerk.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mx-3 mb-2 rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Sheriff Service</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">Letter to the Sheriff</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Illinois Supreme Court form CS-L 706.1. Pre-filled with your case information and signed with your name. Check the appropriate fee waiver box after downloading, then mail with 3 summons copies, 1 complaint copy, a self-addressed stamped envelope, and the service fee.</p>
                          {downloadError && downloadingForm === "il/letter-to-sheriff" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            disabled={downloadingForm === "il/letter-to-sheriff"}
                            onClick={() => downloadSignedFLForm("il/letter-to-sheriff", `IL-Letter-to-Sheriff-Case-${caseId}.pdf`)}
                            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                          >
                            {downloadingForm === "il/letter-to-sheriff" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                            Download
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <label className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${ilServiceMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`} onClick={(e) => { if (ilServiceMethod === "certified_mail") { e.preventDefault(); setIlServiceMethod(""); } }}>
                    <RadioGroupItem value="certified_mail" id="il-serve-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Certified Mail — Least Reliable.</span> The clerk may send the summons by certified mail at your request. Service is only complete if the defendant signs for it. Not recommended if the defendant is likely to refuse delivery.
                    </p>
                  </label>
                  {ilServiceMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                          <p className="text-xs text-blue-800 leading-relaxed">If the defendant refuses or does not sign for the certified mail, service fails. Your case is not dismissed — you can switch to personal service by a process server or sheriff and request a new return date.</p>
                        </div>
                      </div>
                    </div>
                  )}

                </RadioGroup>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Proof of Service</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Illinois Proof of Service</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Give this blank form to your process server. They complete and sign it after serving the defendant, then file it with the Circuit Court clerk before the return date.</p>
                  {downloadError && downloadingForm === "il/proof-of-service" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={downloadingForm === "il/proof-of-service"} onClick={() => downloadSignedFLForm("il/proof-of-service", `IL-Proof-of-Service-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "il/proof-of-service" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ──────────────────────────────────── */}
          {ilWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Application for Waiver of Court Fees</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your name, address, and case information are pre-filled from your intake. Download the form, complete the financial eligibility section, sign it, and file it with the clerk at the same time as your Complaint.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Application for Waiver of Court Fees</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading.</p>
                  <p className="text-xs text-muted-foreground mt-1">Editable fields require Adobe Acrobat.</p>
                  {downloadError && (downloadingForm === "il/fee-waiver" || downloadingForm === "il/fee-waiver/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "il/fee-waiver/signed"} onClick={() => openFlSigModal({ endpoint: "il/fee-waiver", filename: `IL-Fee-Waiver-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "il/fee-waiver/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "il/fee-waiver"} onClick={() => downloadSignedFLForm("il/fee-waiver", `IL-Fee-Waiver-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "il/fee-waiver" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is confidential.</span> The court will not give it to the other party. False statements on a fee waiver form are a criminal offense. File it at the clerk's window at the same time as your Complaint.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={ilWizardIndex === 0} onClick={() => setIlWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={ilWizardIndex === IL_WIZARD_STEPS.length - 1} onClick={() => setIlWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
      )}


      {/* NC forms section */}
      {isNorthCarolinaCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <h3 className="text-base font-bold text-foreground">North Carolina Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={NC_WIZARD_STEPS}
            currentIndex={ncWizardIndex}
            onStepClick={setNcWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: AOC-CVM-200 Complaint ─────────────────────────────────── */}
          {ncWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this Complaint with your county District Court clerk. The magistrate will hear your case and issue a judgment. Claim limit: $10,000 (G.S. 7A-210). Filing fee: <strong>$96 flat</strong> statewide (G.S. 7A-311).
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-CVM-200</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Complaint for Money Owed</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details — plaintiff, defendant, amount claimed, and basis of claim. Sign and file with the clerk at the courthouse.</p>
                  {downloadError && (downloadingForm === "nc/aoc-cvm-200" || downloadingForm === "nc/aoc-cvm-200/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "nc/aoc-cvm-200/signed"} onClick={() => openFlSigModal({ endpoint: "nc/aoc-cvm-200", filename: `NC-Complaint-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "nc/aoc-cvm-200/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "nc/aoc-cvm-200"} onClick={() => downloadSignedFLForm("nc/aoc-cvm-200", `NC-Complaint-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "nc/aoc-cvm-200" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">North Carolina Filing Fees</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">Filing fee (all amounts)</span><span className="font-medium text-blue-900">$96.00 flat</span>
                  <span className="text-blue-700">Sheriff service fee (per defendant)</span><span className="font-medium text-blue-900">$30.00</span>
                  <span className="text-blue-700">Claim limit</span><span className="font-medium text-blue-900">$10,000 (G.S. 7A-210)</span>
                </div>
                <p className="text-xs text-blue-800">Filing and service fees are recoverable as court costs if you win your case (G.S. 7A-305). File a Fee Waiver (AOC-G-106) if you cannot afford the fees — see the Fee Waiver step.</p>
              </div>
            </div>
          )}

          {/* ── Step 1: AOC-CVM-100 Summons ────────────────────────────────────── */}
          {ncWizardIndex === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Magistrate's Summons is prepared and issued by the court clerk — you do not serve the defendant yourself. Bring this pre-filled form to the clerk when you file your Complaint. The clerk signs, seals, and forwards it to the county sheriff for service.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Clerk Completes &amp; Issues</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-CVM-100</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Magistrate's Summons</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details. Bring to the clerk when filing your Complaint — the clerk assigns the hearing date and issues the summons to the sheriff for service on the defendant.</p>
                  {downloadError && downloadingForm === "nc/aoc-cvm-100" && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0">
                  <button type="button" disabled={downloadingForm === "nc/aoc-cvm-100"} onClick={() => downloadSignedFLForm("nc/aoc-cvm-100", `NC-Summons-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "nc/aoc-cvm-100" ? <span className="animate-spin">⏳</span> : <Download className="h-3.5 w-3.5" />}
                    Download
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-900">How NC service works</p>
                <ul className="text-xs text-blue-800 leading-relaxed space-y-1.5">
                  <li>• The sheriff serves the summons on the defendant — <strong>you do not arrange service yourself.</strong></li>
                  <li>• Pay the $30 sheriff service fee (per defendant) when you file with the clerk.</li>
                  <li>• After service, the court mails both parties notice of the hearing date — typically within <strong>30 days of filing</strong> (G.S. 7A-214).</li>
                  <li>• If the sheriff cannot locate the defendant, ask the clerk about alternative service options (certified mail, etc.).</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Step 2: Service info ─────────────────────────────────────────────── */}
          {ncWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Sheriff Serves the Defendant</h4>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Court Handles This</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In North Carolina small claims court, <strong>the sheriff serves the defendant — you do not arrange service yourself.</strong> When you file your Complaint and pay the $30 sheriff service fee, the clerk issues the Magistrate's Summons and forwards it directly to the county sheriff for service.
              </p>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">What to bring to the clerk's window</p>
                    <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                      <li>• Your signed <strong>Complaint (AOC-CVM-200)</strong></li>
                      <li>• The pre-filled <strong>Magistrate's Summons (AOC-CVM-100)</strong></li>
                      <li>• <strong>$96 filing fee</strong> + <strong>$30 sheriff service fee</strong> per defendant</li>
                      <li>• The defendant's full name and best known address</li>
                      <li>• If applicable, your <strong>Fee Waiver (AOC-G-106)</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      The court mails both parties notice of the hearing date. Hearings are typically scheduled within <strong>30 days of filing</strong> (G.S. 7A-214). You and the defendant will both receive a notice by mail. No further action is required on your part for service.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-blue-900 mb-0.5">After winning</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Collection options include: writ of execution (sheriff seizes non-exempt property), bank account garnishment, and judgment lien on real property. <strong>Note: wage garnishment is NOT available for private civil debt in North Carolina</strong> (G.S. 110-136). Filing and service fees are recoverable as court costs (G.S. 7A-305).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Fee Waiver (optional) ─────────────────────────────────── */}
          {ncWizardIndex === 3 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Petition to Sue as Indigent</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you cannot afford the $96 filing fee or $30 sheriff service fee, file this petition with the clerk. If granted, all fees are waived. Your name and case information are pre-filled — complete the financial eligibility section after downloading and file it at the same time as your Complaint.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">AOC-G-106</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Petition to Sue as Indigent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading and sign before filing.</p>
                  {downloadError && (downloadingForm === "nc/aoc-g-106" || downloadingForm === "nc/aoc-g-106/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "nc/aoc-g-106/signed"} onClick={() => openFlSigModal({ endpoint: "nc/aoc-g-106", filename: `NC-Fee-Waiver-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "nc/aoc-g-106/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "nc/aoc-g-106"} onClick={() => downloadSignedFLForm("nc/aoc-g-106", `NC-Fee-Waiver-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "nc/aoc-g-106" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is filed under oath.</span> False statements are subject to criminal penalty under G.S. 14-209. The clerk or magistrate must approve the petition before your filing is accepted without fees. If granted and you win, the court may tax costs against the defendant.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={ncWizardIndex === 0} onClick={() => setNcWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={ncWizardIndex === NC_WIZARD_STEPS.length - 1} onClick={() => setNcWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
      )}


      {/* VA forms section */}
      {isVirginiaCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦅</span>
            <h3 className="text-base font-bold text-foreground">Virginia Court Forms</h3>
          </div>

          <FormWizardStepper
            steps={VA_WIZARD_STEPS}
            currentIndex={vaWizardIndex}
            onStepClick={setVaWizardIndex}
            stepLabel="Form"
          />

          {/* ── Step 0: DC-402 Warrant in Debt ────────────────────────────────── */}
          {vaWizardIndex === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                File this Warrant in Debt with your General District Court clerk. Claim limit: $5,000 (Va. Code § 16.1-122.2). Filing fees vary by county — check with your local clerk or the GDC Civil Filing Fee Calculator before filing.
              </p>
              <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Required</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DC-402</span>
                  </div>
                  <p className="text-base font-bold leading-snug text-foreground">Warrant in Debt</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">Pre-filled with your case details — plaintiff, defendant, amount claimed, and basis of claim. Sign and file with the clerk at the courthouse.</p>
                  {downloadError && (downloadingForm === "va/dc-402" || downloadingForm === "va/dc-402/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "va/dc-402/signed"} onClick={() => openFlSigModal({ endpoint: "va/dc-402", filename: `VA-Warrant-in-Debt-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "va/dc-402/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "va/dc-402"} onClick={() => downloadSignedFLForm("va/dc-402", `VA-Warrant-in-Debt-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "va/dc-402" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-base font-bold text-foreground mb-1">Virginia Filing Fees</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-blue-700">Filing fee</span><span className="font-medium text-blue-900">Varies by county — check with your local clerk</span>
                  <span className="text-blue-700">Claim limit</span><span className="font-medium text-blue-900">$5,000 (Va. Code § 16.1-122.2)</span>
                </div>
                <p className="text-xs text-blue-800">Unlike some states, Virginia does not publish one statewide flat filing fee — amounts are set per General District Court. File a Fee Waiver (DC-409) if you cannot afford the fees — see the Fee Waiver step.</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Service info ─────────────────────────────────────────────── */}
          {vaWizardIndex === 1 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Sheriff Serves the Defendant</h4>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Court Handles This</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In Virginia General District Court, <strong>the sheriff (or a private process server) serves the defendant — you do not arrange service yourself.</strong> When you file your Warrant in Debt, the clerk issues it and arranges service per Va. Code § 17.1-272.
              </p>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">What to bring to the clerk's window</p>
                    <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                      <li>• Your signed <strong>Warrant in Debt (DC-402)</strong></li>
                      <li>• The filing fee — <strong>check with your local clerk for the amount</strong></li>
                      <li>• The defendant's full name and best known address</li>
                      <li>• If applicable, your <strong>Petition to Proceed In Forma Pauperis (DC-409)</strong></li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      The clerk sets a return date and arranges service on the defendant. You and the defendant will both be notified of the hearing date. No further action is required on your part for service.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                  <p className="text-xs font-semibold text-blue-900 mb-0.5">After winning</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    A judgment remains enforceable for 10 years (Va. Code § 16.1-94.1) and may be renewed. Collection options include garnishment and liens as allowed by Virginia law. Attorneys are generally barred from small claims proceedings absent both parties' consent (Va. Code § 16.1-122.4).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Fee Waiver (optional) ─────────────────────────────────── */}
          {vaWizardIndex === 2 && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#0d6b5e]" />
                <h4 className="text-sm font-bold text-foreground">Fee Waiver — Petition to Proceed In Forma Pauperis</h4>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you cannot afford the filing fee, file this petition with the clerk (Va. Code § 17.1-606). Your name and case information are pre-filled — complete the financial eligibility section after downloading and file it at the same time as your Warrant in Debt.
              </p>
              <div className="rounded-xl border bg-muted/20 p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">DC-409</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Petition to Proceed In Forma Pauperis</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your name and case information. Complete the financial eligibility section after downloading and sign before filing.</p>
                  {downloadError && (downloadingForm === "va/dc-409" || downloadingForm === "va/dc-409/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <button type="button" disabled={downloadingForm === "va/dc-409/signed"} onClick={() => openFlSigModal({ endpoint: "va/dc-409", filename: `VA-Fee-Waiver-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {downloadingForm === "va/dc-409/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                    Sign &amp; Download
                  </button>
                  <button type="button" disabled={downloadingForm === "va/dc-409"} onClick={() => downloadSignedFLForm("va/dc-409", `VA-Fee-Waiver-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                    {downloadingForm === "va/dc-409" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                    Skip signing
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-800 leading-relaxed">
                  <span className="font-semibold">This form is filed under oath.</span> The clerk or judge must approve the petition before your filing is accepted without fees.
                </p>
              </div>
            </div>
          )}

          {/* Wizard nav */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={vaWizardIndex === 0} onClick={() => setVaWizardIndex(i => i - 1)} className="gap-1.5">← Previous</Button>
            <Button variant="outline" size="sm" disabled={vaWizardIndex === VA_WIZARD_STEPS.length - 1} onClick={() => setVaWizardIndex(i => i + 1)} className="gap-1.5">Next →</Button>
          </div>
        </div>
      )}


      {/* NJ forms section — CN 10532 Small Claims Complaint (Appendix XI-C) */}
      {isNewJerseyCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <h3 className="text-base font-bold text-foreground">New Jersey Court Forms</h3>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CN 10532</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Small Claims Complaint</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details — plaintiff, defendant, county, amount claimed, and basis of claim. Sign and file with the Special Civil Part clerk.</p>
              {downloadError && (downloadingForm === "nj/complaint" || downloadingForm === "nj/complaint/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={downloadingForm === "nj/complaint/signed"} onClick={() => openFlSigModal({ endpoint: "nj/complaint", filename: `NJ-Small-Claims-Complaint-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {downloadingForm === "nj/complaint/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                Sign &amp; Download
              </button>
              <button type="button" disabled={downloadingForm === "nj/complaint"} onClick={() => downloadSignedFLForm("nj/complaint", `NJ-Small-Claims-Complaint-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                {downloadingForm === "nj/complaint" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                Skip signing
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">After you file</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  The clerk mails the Summons and Return of Service to the defendant. If you cannot afford the filing fee, ask the clerk for the Application to Proceed as an Indigent when you file.
                </p>
              </div>
            </div>
            <a href="https://www.njcourts.gov/self-help/small-claims-court" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              NJ Courts Small Claims Self-Help <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* WA forms section — MISC 05.0100 Notice of Small Claim + MISC 05.0200 Certificate of Service */}
      {isWashingtonCase && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏔️</span>
            <h3 className="text-base font-bold text-foreground">Washington Court Forms</h3>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">MISC 05.0100</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Notice of Small Claim</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-filled with your case details — the main form you file to start your case in District Court.</p>
              {downloadError && (downloadingForm === "wa/notice" || downloadingForm === "wa/notice/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={downloadingForm === "wa/notice/signed"} onClick={() => openFlSigModal({ endpoint: "wa/notice", filename: `WA-Notice-of-Small-Claim-Signed-Case-${caseId}.pdf` })} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {downloadingForm === "wa/notice/signed" ? <span className="animate-spin">⏳</span> : <PenLine className="h-3.5 w-3.5" />}
                Sign &amp; Download
              </button>
              <button type="button" disabled={downloadingForm === "wa/notice"} onClick={() => downloadSignedFLForm("wa/notice", `WA-Notice-of-Small-Claim-Case-${caseId}.pdf`)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60">
                {downloadingForm === "wa/notice" ? <span className="animate-spin">⏳</span> : <Download className="h-3 w-3" />}
                Skip signing
              </button>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">MISC 05.0200</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Certificate of Service</p>
              <p className="text-xs text-muted-foreground mt-0.5">Complete and file after the defendant has been served, to prove service to the court.</p>
              {downloadError && (downloadingForm === "wa/service" || downloadingForm === "wa/service/signed") && <p className="mt-1 text-xs text-destructive">{downloadError}</p>}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1.5">
              <button type="button" disabled={downloadingForm === "wa/service"} onClick={() => downloadSignedFLForm("wa/service", `WA-Certificate-of-Service-Case-${caseId}.pdf`)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {downloadingForm === "wa/service" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCheck className="h-3.5 w-3.5" />}
                Download
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2.5">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-900 mb-0.5">Filing and service</p>
                <p className="text-xs text-blue-800 leading-relaxed">
                  File the Notice of Small Claim with the District Court clerk, who sets a hearing date. You are responsible for arranging service on the defendant per RCW 12.40 — then file the Certificate of Service before your hearing.
                </p>
              </div>
            </div>
            <a href="https://www.courts.wa.gov/newsinfo/resources/index.cfm?fa=newsinfo_resources.smallclaims" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
              Washington Courts Small Claims Resources <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* CA form wizard — California only */}
      {!isFloridaCase && !isTexasCase && !isIllinoisCase && !isNorthCarolinaCase && !isVirginiaCase && !isNewJerseyCase && !isWashingtonCase && <>

      {/* Mobile tutorial trigger — hidden on desktop */}
      <button
        type="button"
        onClick={() => setTutorialOpen(true)}
        className="sm:hidden flex items-center gap-2 rounded-lg border border-[#14b8a6] bg-[#f0fffe] px-3 py-2 text-xs font-semibold text-[#0d6b5e] w-full"
      >
        <Play className="h-3.5 w-3.5 shrink-0" fill="currentColor" />
        Watch Tutorial Video — Court Forms
        <ChevronRight className="h-3 w-3 ml-auto shrink-0" />
      </button>

      {/* ── Top row: progress tracker + video card ─────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Progress tracker */}
          <div className="flex-1">
            <FormWizardStepper
              steps={wizardSteps}
              currentIndex={wizardIndex}
              onStepClick={setWizardIndex}
              stepLabel="Form"
            />
          </div>

        {/* Video card — desktop only */}
        <div
          onClick={() => setTutorialOpen(true)}
          className="hidden sm:block cursor-pointer group flex-shrink-0 w-[220px] rounded-xl overflow-hidden border-2 border-[#14b8a6] shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
          title="Watch the tutorial for this step"
        >
          <div className="relative bg-[#0f2537] h-[120px] flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/30 via-transparent to-[#0f2537]" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#14b8a6] flex items-center justify-center shadow-lg group-hover:bg-[#0d9488] transition-colors">
                <Play className="w-[18px] h-[18px] text-white ml-1" fill="white" />
              </div>
              <span className="text-white text-xs font-semibold opacity-90">Watch Tutorial</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">~3 min</div>
            <div className="absolute top-2 left-2 bg-[#14b8a6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Step 6</div>
          </div>
          <div className="bg-background px-3 py-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">Create Court Forms</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Download &amp; fill your forms</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#14b8a6] shrink-0" />
          </div>
        </div>

      </div>

      {/* ── Form card ──────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border-2 border-border transition-all">

        {/* Card header */}
        {currentStep.id !== "sc104" && (
        <>

        {/* ── Process Server card — vertical layout so radio group gets full width ── */}
        {currentStep.id === "sc112a" && (
          <div className="p-4">
            {/* Top row: heading left, guide button right */}
            <div className="flex items-center justify-between gap-4 mb-2">
              <h4 className="text-base font-bold text-foreground leading-snug">Notify Defendant Immediately after filing with the court</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuideDialogFormId(currentStep.id)}
                className="h-7 text-xs gap-1 px-2 shrink-0"
                title="How to fill out this form"
              >
                <Info className="w-3.5 h-3.5" />How to Fill Video
              </Button>
            </div>
            {/* Radio group + deadline warning — full card width */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <RadioGroup value={notifyMethod} onValueChange={setNotifyMethod} className="gap-0">

                  {/* Radio 1 — Process Server — Best overall option */}
                  <label
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "process_server" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                    onClick={(e) => { if (notifyMethod === "process_server") { e.preventDefault(); setNotifyMethod(""); } }}
                  >
                    <RadioGroupItem value="process_server" id="notify-ps" className="mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">Recommended — Most Reliable</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/cases/${caseId}/efile`); }}
                          className="shrink-0 flex items-center gap-2 rounded-lg border-2 border-black bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-1.5 text-center transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-bold leading-tight">e-File and/or Service by Process Server</span>
                        </button>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        <span className="font-bold">Service by Process Server — Best overall option.</span> A professional Licensed and Bonded Process Server finds and serves the defendant correctly. This usually costs more, it is the most reliable choice if the defendant may avoid service or if your hearing date is coming up. When you win, your costs may be recoverable. The process server will file the Proof of Service with the court. Make sure you get a stamped copy from the Process Server to bring to court.
                      </p>
                    </div>
                  </label>
                  {notifyMethod === "process_server" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">e-Filing and Serving Your Small Claims Case With a Licensed Process Server</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After your Small Claims Genie packet is prepared, your case still needs to be filed with the court and served on the defendant. A licensed process server may be able to e-file your case, receive the court-stamped documents, serve the defendant, and file the proof of service with the court if available in your county.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Be Ready to Provide</p>
                          <ul className="text-xs text-blue-800 leading-relaxed space-y-1 mt-1">
                            <li>• Your completed Small Claims Genie filing packet with all forms — make sure they are signed by you.</li>
                            <li>• The defendant's full legal name.</li>
                            <li>• The defendant's best address for service.</li>
                            <li>• Any helpful details such as work address, business hours, apartment number, gate code, vehicle description, or photo.</li>
                            <li>• Your contact information and any deadline concerns.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5 space-y-1.5">
                        <p className="text-xs font-semibold text-blue-900">Important</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Filing your case does not mean the defendant has been served. Your hearing may be delayed if the defendant is not served correctly or if the proof of service is not filed before the deadline.</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Small Claims Genie does not file or serve documents for you. A process server or legal support provider may charge separate fees for court filing, e-filing, service attempts, and proof-of-service filing.</p>
                      </div>

                    </div>
                  )}

                  {/* Radio 2 — Adult Service */}
                  <label
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "adult_service" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                    onClick={(e) => { if (notifyMethod === "adult_service") { e.preventDefault(); setNotifyMethod(""); } }}
                  >
                    <RadioGroupItem value="adult_service" id="notify-adult" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Service by Adult</span> — Reliable low-cost option. Someone 18 or older, who is not part of the case, hands the papers to the defendant. That person must complete Proof of Service (SC-104 – Proof of Service) generated from this system. You file it with the court as soon as possible and bring a stamped copy to your hearing as proof.
                    </p>
                  </label>
                  {notifyMethod === "adult_service" && (
                    <>
                      {/* Amber Required Card */}
                      <div className="mx-3 mb-2 rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-200 rounded px-1.5 py-0.5">Required</span>
                          <p className="text-xs font-bold text-amber-900">Complete the SC-104 — Proof of Service</p>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">This form must be completed by the person who served the court papers — not you — and filed with the court before your hearing. Open it below, have your server fill it out and sign it, then file it.</p>
                        <Button size="sm" className="h-8 text-xs gap-1.5 px-4 shrink-0 bg-[#0d6b5e] hover:bg-[#0a5a4f] text-white border-0 w-full sm:w-auto"
                          onClick={openSC104InNewTab}
                          disabled={downloadingForm === "sc104"}>
                          {downloadingForm === "sc104" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                          Open and Complete the SC-104 — Proof of Service
                        </Button>
                      </div>

                      {/* Blue Instructions Panel */}
                      <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">You Cannot Serve the Papers Yourself</p>
                          <p className="text-xs text-blue-800 leading-relaxed">The person serving the documents must be at least 18 years old and must not be a party in the case.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4 — How the Third-Party Server Delivered the Papers</p>
                          <p className="text-xs text-blue-800 leading-relaxed">The third-party server fills out only one part of Section 4, depending on how the papers were delivered.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4a — Personal Service</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Use this if the server handed the papers directly to the defendant or to the correct authorized person for the business. The server must enter the date and time of delivery, plus the full address including city, state, and ZIP code.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 4b — Substituted Service</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Use this if the server left the papers with another responsible adult instead of handing them directly to the defendant. The server must check the box showing who received the papers, enter the date, time, and address, and write the name or description of the adult who received them.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 5 — Server's Information</p>
                          <p className="text-xs text-blue-800 leading-relaxed">The person serving the documents enters their own name, phone number, address, city, state, and ZIP code.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Section 6 — Third-Party Server's Signature</p>
                          <p className="text-xs text-blue-800 leading-relaxed">After serving the papers, the third-party server dates, prints their name, and signs the form. Do not complete or sign this section yourself — the person who served the papers must be the one who signs.</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">After the Server Signs</p>
                        <p className="text-xs text-blue-800 leading-relaxed">File the completed SC-104 with the court as soon as possible. The form must be filed at least <strong>5 days before the hearing</strong>.</p>
                      </div>

                    </div>
                    </>
                  )}

                  {/* Radio 3 — Certified Mail by Clerk (lowest-cost option) */}
                  <label
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 cursor-pointer transition-colors border ${notifyMethod === "certified_mail" ? "border-[#0d6b5e]/40 bg-[#0d6b5e]/5" : "border-transparent hover:bg-muted/40"}`}
                    onClick={(e) => { if (notifyMethod === "certified_mail") { e.preventDefault(); setNotifyMethod(""); } }}
                  >
                    <RadioGroupItem value="certified_mail" id="notify-mail" className="mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold">Court Clerk Sends by Certified Mail</span> — Lowest-cost, <span className="font-bold">least reliable option</span>. Ask the clerk for certified-mail service when you file at court. The clerk handles the mailing, so no extra service papers are needed. Service only counts if the defendant signs for delivery. If the defendant refuses, ignores, or does not sign for the mail, service fails and the deadline does not restart. If Service by Clerk is refused by defendant, you can still follow-up and implement these services for reliability.
                    </p>
                  </label>

                  {/* Conditional guidance box — certified mail selected */}
                  {notifyMethod === "certified_mail" && (
                    <div className="mx-3 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">

                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">At the Filing Window</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Ask the clerk to send the defendant your claim by certified mail. Some courts require a local request form and a small certified-mail fee — ask the clerk whether anything else is needed before leaving the filing window.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Service Is Only Complete If the Defendant Signs</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Do not assume the defendant has been served just because the clerk mailed the papers. Service is only complete if the certified-mail receipt is signed by the defendant and the court accepts it as valid proof.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Check Status 10–14 Days After Filing</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Look up your case online using your case number, or contact the clerk to confirm whether the signed receipt came back and was accepted by the court.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">If Certified Mail Fails</p>
                          <p className="text-xs text-blue-800 leading-relaxed mb-1">Service fails if the defendant refused delivery, ignored the postal notice, someone else signed in a way the court doesn't accept, or the mail was returned. Your case is <strong>not dismissed</strong> — you do not need to start over.</p>
                          <p className="text-xs text-blue-800 leading-relaxed">Switch to another method quickly: personal service by an adult not involved in your case, sheriff service, or a registered process server.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Watch the Service Deadline</p>
                          <p className="text-xs text-blue-800 leading-relaxed">The defendant must be served at least <strong>15 days before the hearing</strong> if they are in the same county, or <strong>20 days before</strong> if they are outside the county. A failed certified mail attempt does <strong>not</strong> restart that deadline.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-blue-900 mb-0.5">Not Enough Time? Request a Postponement</p>
                          <p className="text-xs text-blue-800 leading-relaxed">If the hearing date is too close to complete service, file <strong>SC-150 (Request to Postpone Trial)</strong> — available in the optional forms section below. File at least 10 days before the hearing when possible.</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-blue-100 border border-blue-200 px-3 py-2.5">
                        <p className="text-xs font-semibold text-blue-900 mb-0.5">Recommended Next Step</p>
                        <p className="text-xs text-blue-800 leading-relaxed">Check the case status with the clerk as soon as possible after the mailing attempt. If no signed receipt is on file, don't wait — switch to a more reliable service method and request a postponement if the hearing date is too close.</p>
                      </div>

                    </div>
                  )}

                </RadioGroup>
              </div>

              {/* Deadline Warning */}
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 mb-1">Deadline Warning</p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  The defendant must be served before the court deadline — usually <span className="font-semibold">15 days before the hearing</span> if the defendant is in the same county, or <span className="font-semibold">20 days before the hearing</span> if outside the county. If service fails, act quickly. You may need to serve another way. If you are running out of time, file <span className="font-semibold">SC-150 Request to Postpone Trial</span> below. If the court gives you a new hearing date, the service deadline is based on that new date.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Standard card header — horizontal layout for all other forms ── */}
        {currentStep.id !== "sc112a" && (
        <div className="border-b">
          {/* Top row: icon + form info + guide button */}
          <div className="p-5 pb-3 flex items-start gap-4 relative">
            <div className="rounded-lg p-2.5 shrink-0 bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">{currentStep.number}</span>
                <Badge variant={currentStep.status === "optional" ? "outline" : "default"} className="text-xs">
                  {currentStep.status === "optional" ? "Optional" : "Required"}
                </Badge>
                {currentStep.id === "sc103" && isBusinessCase && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200 font-medium">Business cases only</span>
                )}
                {isReady && currentStep.id === "sc100" && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#0d6b5e]">
                    <CheckCircle2 className="h-3 w-3" />Ready to file
                  </span>
                )}
              </div>
              <p className="text-base font-bold mt-1.5 leading-snug text-foreground truncate">
                {catalogCurrentForm?.name ?? currentStep.shortLabel}
                {catalogCurrentForm?.shortDesc && (
                  <span className="font-normal text-sm text-muted-foreground"> — {catalogCurrentForm.shortDesc}</span>
                )}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuideDialogFormId(currentStep.id)}
                className="h-7 text-xs gap-1 px-2"
                title="How to fill out this form"
              >
                <Info className="w-3.5 h-3.5" />How to Fill Video
              </Button>
              {catalogCurrentForm?.blankFormUrl && (
                <a
                  href={catalogCurrentForm.blankFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap"
                >
                  Blank ↗
                </a>
              )}
            </div>
          </div>
          {currentStep.id === "mc030" && (
            <div className="px-5 pb-4">
              <button onClick={generateMC030Declaration} disabled={mc030AiGenerating}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-[#0d6b5e]/10 text-[#0d6b5e] border border-gray-800 hover:bg-[#0d6b5e]/20 transition-colors disabled:opacity-50">
                {mc030AiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {mc030AiGenerating ? "Writing declaration…" : "Write My Declaration with AI Genie"}
              </button>
            </div>
          )}
        </div>
        )}

        </>
        )}

        {/* Card body */}
        {currentStep.id !== "sc112a" && (
          <div className="p-5">
            {renderStepBody()}
          </div>
        )}

      </div>


      {/* ── Additional Forms ────────────────────────────────────────────────── */}
      {additionalSteps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Additional Forms</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <p className="text-xs text-muted-foreground">
            These forms are not required to file your case but may be useful depending on how your case develops.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {additionalSteps.map(step => {
              const catalog = FORMS_CATALOG.find(f => f.id === step.id);
              const hasFieldConfig = !!FORM_FIELD_CONFIG[step.id];
              return (
                <div key={step.id} className="bg-card rounded-xl border p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 shrink-0 bg-amber-50 border border-amber-200">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">{step.number}</span>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">Optional</Badge>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{catalog?.name ?? step.shortLabel}</p>
                      {catalog?.shortDesc && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{catalog.shortDesc}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {step.id === "sc100a" ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5"
                          onClick={viewSC100A} disabled={viewingPdf}>
                          {viewingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5"
                          onClick={() => { setSc100aFormBody({ signDate: new Date().toISOString().split("T")[0], extraDefendant: null, extraPlaintiff: null }); setSc100aSigModalOpen(true); }}>
                          <PenLine className="h-3 w-3" />Sign &amp; Download
                        </Button>
                      </>
                    ) : step.id === "sc104" ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-3"
                        onClick={openSC104InNewTab}
                        disabled={downloadingForm === "sc104"}>
                        {downloadingForm === "sc104" ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                        Open SC-104 PDF
                      </Button>
                    ) : step.id === "sc103" ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5"
                          onClick={viewSC103} disabled={viewingPdf}>
                          {viewingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2.5"
                          onClick={() => setSc103SigModalOpen(true)}
                          disabled={downloadingForm === "sc103"}>
                          {downloadingForm === "sc103" ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download
                        </Button>
                      </>
                    ) : hasFieldConfig ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-3"
                        onClick={() => { setModalInitialValues(getInitialValues(step.id)); setModalFormId(step.id); }}>
                        <Download className="h-3 w-3" />Fill Out &amp; Download
                      </Button>
                    ) : catalog?.blankFormUrl ? (
                      <a href={catalog.blankFormUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-3">
                          <Download className="h-3 w-3" />Download Blank PDF
                        </Button>
                      </a>
                    ) : null}
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-3"
                      onClick={() => setGuideDialogFormId(step.id)}>
                      <Info className="h-3 w-3" />Guide
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SC-100 Edit Fields Dialog ──────────────────────────────────────── */}
      <Dialog open={sc100EditOpen} onOpenChange={(o) => { if (!o) setSc100EditOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">SC-100</span>
                <DialogTitle className="text-base font-bold">Edit Form Fields</DialogTitle>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Review and correct any details before downloading. Changes here only affect the downloaded PDF — your case data is unchanged.</p>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-6">

              {/* Plaintiff */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#0d6b5e] mb-3">You (Plaintiff)</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name</label>
                    <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                      value={sc100Fields.plaintiffName ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffName: e.target.value }))} placeholder="Your full legal name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Street Address</label>
                    <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                      value={sc100Fields.plaintiffAddress ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffAddress: e.target.value }))} placeholder="Street address" />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1">City</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.plaintiffCity ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffCity: e.target.value }))} placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">State</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.plaintiffState ?? "CA"} onChange={e => setSc100Fields(p => ({ ...p, plaintiffState: e.target.value }))} placeholder="CA" maxLength={2} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1">ZIP Code</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.plaintiffZip ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffZip: e.target.value }))} placeholder="ZIP" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Phone</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.plaintiffPhone ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffPhone: e.target.value }))} placeholder="(555) 000-0000" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Email</label>
                      <input type="email" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.plaintiffEmail ?? ""} onChange={e => setSc100Fields(p => ({ ...p, plaintiffEmail: e.target.value }))} placeholder="you@email.com" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Defendant */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#0d6b5e] mb-3">Defendant</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Full Name / Business Name</label>
                    <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                      value={sc100Fields.defendantName ?? ""} onChange={e => setSc100Fields(p => ({ ...p, defendantName: e.target.value }))} placeholder="Defendant's full legal name or business name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Street Address</label>
                    <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                      value={sc100Fields.defendantAddress ?? ""} onChange={e => setSc100Fields(p => ({ ...p, defendantAddress: e.target.value }))} placeholder="Street address" />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1">City</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.defendantCity ?? ""} onChange={e => setSc100Fields(p => ({ ...p, defendantCity: e.target.value }))} placeholder="City" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">State</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.defendantState ?? "CA"} onChange={e => setSc100Fields(p => ({ ...p, defendantState: e.target.value }))} placeholder="CA" maxLength={2} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold mb-1">ZIP Code</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.defendantZip ?? ""} onChange={e => setSc100Fields(p => ({ ...p, defendantZip: e.target.value }))} placeholder="ZIP" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Defendant Phone</label>
                    <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                      value={sc100Fields.defendantPhone ?? ""} onChange={e => setSc100Fields(p => ({ ...p, defendantPhone: e.target.value }))} placeholder="(555) 000-0000" />
                  </div>
                </div>
              </div>

              {/* Claim Details */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#0d6b5e] mb-3">Claim Details</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Claim Amount ($)</label>
                      <input type="number" min="0" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.claimAmount ?? ""} onChange={e => setSc100Fields(p => ({ ...p, claimAmount: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Date(s) of Incident</label>
                      <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
                        value={sc100Fields.incidentDate ?? ""} onChange={e => setSc100Fields(p => ({ ...p, incidentDate: e.target.value }))} placeholder="e.g. January 15, 2024" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Why You Are Owed This Money <span className="text-rose-500">*</span></label>
                    <textarea rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] resize-none"
                      value={sc100Fields.claimDescription ?? ""} onChange={e => setSc100Fields(p => ({ ...p, claimDescription: e.target.value }))} placeholder="Briefly explain what happened and why you are owed this amount." />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">How You Calculated the Amount</label>
                    <textarea rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] resize-none"
                      value={sc100Fields.howAmountCalculated ?? ""} onChange={e => setSc100Fields(p => ({ ...p, howAmountCalculated: e.target.value }))} placeholder="e.g. Unpaid balance of $1,500 plus security deposit of $900" />
                  </div>
                </div>
              </div>

              {/* Additional Form Questions */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[#0d6b5e] mb-3">Form Questions</h4>
                <div className="space-y-3">
                  {[
                    { key: "priorDemandMade", label: "Did you ask the defendant for payment before filing?", hint: "Required on the SC-100 form" },
                    { key: "isSuingPublicEntity", label: "Are you suing a government agency or public entity?", hint: "e.g. city, county, school district" },
                    { key: "isAttyFeeDispute", label: "Is this a dispute over attorney fees?", hint: "Attorney fee arbitration disputes only" },
                    { key: "filedMoreThan12Claims", label: "Have you filed more than 12 small claims cases in California in the last 12 months?", hint: "" },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-xs font-semibold">{label}</p>
                        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {["yes", "no"].map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setSc100Fields(p => ({ ...p, [key]: p[key] === opt ? "" : opt }))}
                            className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${sc100Fields[key] === opt ? "bg-[#0d6b5e] text-white border-[#0d6b5e]" : "bg-background text-foreground border-input hover:border-[#14b8a6]"}`}>
                            {opt === "yes" ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setSc100EditOpen(false)} className="h-8 text-xs px-4">Cancel</Button>
            <Button size="sm" onClick={downloadWithOverrides} disabled={downloadingWithOverrides}
              className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-4">
              {downloadingWithOverrides ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Download with Edits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modalFormId && (
        <FormAssistantModal
          key={`${modalFormId}-${JSON.stringify(modalInitialValues)}`}
          formId={modalFormId}
          caseId={caseId}
          initialValues={modalInitialValues}
          onClose={() => setModalFormId(null)}
          onDownload={(endpoint, filename, body) => {
            if (endpoint === "sc104") {
              setModalFormId(null);
              openSC104InNewTab();
            } else if (endpoint === "sc100a") {
              setSc100aFormBody(body);
              setModalFormId(null);
              setSc100aSigModalOpen(true);
            } else {
              downloadFormPost(endpoint, filename, body);
            }
          }}
          onAiGenerate={modalFormId === "mc030" ? generateMC030Declaration : undefined}
          onAiDraftSC105={modalFormId === "sc105" ? generateSC105Draft : undefined}
        />
      )}

      <SignaturePadModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSign={(dataUrl) => { setSigModalOpen(false); downloadSignedSC100(dataUrl); }}
        onSkipSign={() => { setSigModalOpen(false); downloadSignedSC100(); }}
      />

      <SignaturePadModal
        open={mc030SigModalOpen}
        onClose={() => setMc030SigModalOpen(false)}
        formTitle="MC-030"
        disclaimer="By signing, you declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct."
        onSign={(dataUrl) => { setMc030SigModalOpen(false); downloadSignedMC030(dataUrl); }}
        onSkipSign={() => { setMc030SigModalOpen(false); downloadMC030Packet(); }}
      />

      <SignaturePadModal
        open={sc104SigModalOpen}
        onClose={() => setSc104SigModalOpen(false)}
        formTitle="SC-104"
        disclaimer="By signing, the server declares under penalty of perjury under the laws of the State of California that they are at least 18 years old, not named in this case, and that the information above is true and correct."
        onSign={(dataUrl) => { setSc104SigModalOpen(false); downloadSignedSC104(dataUrl); }}
        onSkipSign={() => { setSc104SigModalOpen(false); downloadSignedSC104(); }}
      />


      <SignaturePadModal
        open={sc100aSigModalOpen}
        onClose={() => setSc100aSigModalOpen(false)}
        formTitle="SC-100A"
        disclaimer="By signing, the additional plaintiff declares under penalty of perjury under the laws of the State of California that they have read the foregoing and that the information is true and correct."
        onSign={(dataUrl) => { setSc100aSigModalOpen(false); downloadSignedSC100A(dataUrl); }}
        onSkipSign={() => { setSc100aSigModalOpen(false); downloadSignedSC100A(); }}
      />
      <SignaturePadModal
        open={sc103SigModalOpen}
        onClose={() => setSc103SigModalOpen(false)}
        formTitle="SC-103"
        disclaimer="By signing, you declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct."
        onSign={(dataUrl) => { setSc103SigModalOpen(false); downloadSignedSC103(dataUrl); }}
        onSkipSign={() => { setSc103SigModalOpen(false); downloadSignedSC103(); }}
      />

      <SignaturePadModal
        open={sc103bSigModalOpen}
        onClose={() => setSc103bSigModalOpen(false)}
        formTitle="SC-103 (Plaintiff 2)"
        disclaimer="By signing, the additional plaintiff declares under penalty of perjury under the laws of the State of California that the foregoing is true and correct."
        onSign={(dataUrl) => { setSc103bSigModalOpen(false); downloadSignedSC103B(dataUrl); }}
        onSkipSign={() => { setSc103bSigModalOpen(false); downloadSignedSC103B(); }}
      />

      <SignaturePadModal
        open={fw001SigModalOpen}
        onClose={() => setFw001SigModalOpen(false)}
        formTitle="FW-001"
        disclaimer="By signing, you declare under penalty of perjury that the information in this fee waiver request is true and correct."
        onSign={async (dataUrl) => {
          setFw001SigModalOpen(false);
          setFw001Loading(true);
          try {
            const clerkToken = await getToken();
            const res = await fetch(`/api/cases/${caseId}/forms/fw001/interactive`, {
              method: "POST",
              headers: { Authorization: `Bearer ${clerkToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ signatureDataUrl: dataUrl }),
            });
            if (!res.ok) { toast({ title: "Error", description: "Could not load FW-001 — please try again." }); return; }
            const blob = await res.blob();
            setFw001BlobUrl(URL.createObjectURL(blob));
          } catch {
            toast({ title: "Error", description: "Could not load FW-001 — please try again." });
          } finally {
            setFw001Loading(false);
          }
        }}
        onSkipSign={async () => {
          setFw001SigModalOpen(false);
          setFw001Loading(true);
          try {
            const clerkToken = await getToken();
            const res = await fetch(`/api/cases/${caseId}/forms/fw001/interactive`, {
              headers: { Authorization: `Bearer ${clerkToken}` },
            });
            if (!res.ok) { toast({ title: "Error", description: "Could not load FW-001 — please try again." }); return; }
            const blob = await res.blob();
            setFw001BlobUrl(URL.createObjectURL(blob));
          } catch {
            toast({ title: "Error", description: "Could not load FW-001 — please try again." });
          } finally {
            setFw001Loading(false);
          }
        }}
      />

      {/* Guide Dialog */}
      <Dialog open={!!guideDialogFormId} onOpenChange={(open) => { if (!open) setGuideDialogFormId(null); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {guideDialogForm && (() => {
            const guide = FORM_GUIDE_CONTENT[guideDialogForm.id];
            return (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold tracking-widest uppercase bg-[#0d6b5e] text-white px-3 py-1 rounded-full">{guideDialogForm.number}</span>
                    <DialogTitle className="text-xl font-bold leading-tight">How to Fill the {guideDialogForm.number}</DialogTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{guideDialogForm.detailDesc}</p>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="px-6 py-5 space-y-6">
                    {guideDialogForm.number === "SC-100" ? (
                      <iframe
                        width="100%"
                        height="400"
                        src="https://app.heygen.com/embeds/8f1956314de543b38cc9349743daefbb"
                        title="HeyGen video player"
                        frameBorder="0"
                        allow="encrypted-media; fullscreen;"
                        allowFullScreen
                        className="block rounded-lg"
                      />
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-2 py-10 px-4">
                        <svg className="text-muted-foreground/40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                        <p className="text-sm font-medium text-muted-foreground">Video guide — coming soon</p>
                      </div>
                    )}
                    {guide && (
                      <div className="space-y-6">
                        <div className="rounded-xl bg-[#ddf6f3] border border-[#0d6b5e]/20 px-5 py-4">
                          <p className="text-sm font-semibold text-[#0d6b5e] leading-relaxed">{guide.bestUse}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="rounded-xl border bg-card p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#0d6b5e]">Use this form when</p>
                            <ul className="space-y-2">
                              {guide.whenToUse.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                                  <svg className="mt-0.5 shrink-0 text-[#0d6b5e]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl border bg-card p-4 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Do not use this form when</p>
                            <ul className="space-y-2">
                              {guide.whenNotToUse.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                                  <svg className="mt-0.5 shrink-0 text-rose-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">What to have ready</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {guide.haveReady.map((item, i) => (
                              <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                                <div className="mt-0.5 h-5 w-5 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center shrink-0"><span className="text-[10px] font-bold text-[#0d6b5e]">{i + 1}</span></div>
                                <p className="text-sm text-foreground leading-relaxed">{item}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        {guideDialogForm.id === "sc100" && (
                          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5 space-y-2">
                            <div className="flex items-start gap-3">
                              <svg className="mt-0.5 shrink-0 text-blue-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <div>
                                <h3 className="text-sm font-bold text-blue-900">MC-030 Declaration — Always Included</h3>
                                <p className="text-sm text-blue-800 leading-relaxed">MC-030 is included with every California case — not just long descriptions. It gives you a full page to state the facts under penalty of perjury and strengthens your evidence packet. File it with the clerk at the same time as your SC-100 — they are two separate documents.</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {guide.warnings.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">Important things to know</h3>
                            <div className="space-y-2">
                              {guide.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                                  <svg className="mt-0.5 shrink-0 text-amber-500" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                  <p className="text-sm text-amber-800 leading-relaxed">{w}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {guide.relatedForms.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/70">Related forms &amp; next steps</h3>
                            <div className="flex flex-wrap gap-2">
                              {guide.relatedForms.map((rf, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                  <span className="text-[11px] font-bold text-[#0d6b5e]">{rf.number}</span>
                                  <span className="text-xs text-muted-foreground">{rf.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="px-6 py-4 border-t flex justify-end">
                  <Button variant="outline" onClick={() => setGuideDialogFormId(null)}>Close</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Tutorial modal ── */}
      {tutorialOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setTutorialOpen(false)}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-[840px] mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b bg-[#f8fffe]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#14b8a6] flex items-center justify-center">
                  <Play className="w-3 h-3 text-white ml-0.5" fill="white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">Step 6 Tutorial — Create Court Forms</p>
                  <p className="text-[10px] text-gray-500">Small Claims Genie Training Video</p>
                </div>
              </div>
              <button onClick={() => setTutorialOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              width="840"
              height="472"
              src="https://app.heygen.com/embeds/ed2f05f6f5c643efa9d95d9b8de488c7"
              title="HeyGen video player"
              frameBorder="0"
              allow="encrypted-media; fullscreen;"
              allowFullScreen
              className="block w-full"
            />
          </div>
        </div>
      )}

      </> /* end !isFloridaCase CA wizard */}

      <SignaturePadModal
        open={!!flSigModal}
        onClose={() => setFlSigModal(null)}
        formTitle={flSigModal?.title ?? "Court Form"}
        disclaimer="By signing, you certify that the information in this form is true and correct to the best of your knowledge."
        onSign={(dataUrl) => {
          if (flSigModal) downloadSignedFLForm(flSigModal.endpoint, flSigModal.filename, dataUrl);
        }}
        onSkipSign={() => {
          if (flSigModal) downloadSignedFLForm(flSigModal.endpoint, flSigModal.filename);
        }}
      />

    </div>
  );
}

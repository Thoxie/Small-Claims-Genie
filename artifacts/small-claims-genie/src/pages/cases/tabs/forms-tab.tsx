import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetCaseReadiness } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Info, Loader2, PenLine, RotateCcw, FileText, CheckCircle2, AlertTriangle, Mail, BookOpen, Paperclip, Sparkles, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Forms Catalog ────────────────────────────────────────────────────────────
const FORMS_CATALOG = [
  { id: "sc100", number: "SC-100", name: "Plaintiff's Claim and ORDER to Go to Small Claims Court", shortDesc: "The primary form to file your small claims case.", detailDesc: "SC-100 is the form that starts your California small claims case. It tells the court who you are suing, how much money you want, and why you are asking the court to order payment.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc100.pdf", caseTypes: "both" as const },
  { id: "mc030", number: "MC-030", name: "Declaration", shortDesc: "A general sworn statement form for information that doesn't fit on the main form.", detailDesc: "MC-030 is a blank declaration form used across many types of California court cases, including small claims. It is used whenever a party needs to submit a written statement under penalty of perjury that doesn't fit within the space provided on a specific form.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/mc030.pdf", caseTypes: "both" as const },
  { id: "sc104", number: "SC-104", name: "Proof of Service", shortDesc: "Documents that the defendant was properly served with the court papers.", detailDesc: "SC-104 is completed by the person who delivered (served) the court papers to the defendant — this must be someone who is at least 18 years old and not named in the case.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc104.pdf", caseTypes: "both" as const },
  { id: "fw001", number: "FW-001", name: "Request to Waive Court Fees", shortDesc: "Ask the court to waive your filing fees if paying would be a financial hardship.", detailDesc: "FW-001 lets you ask the court to waive court filing fees when you cannot afford them. You may qualify if you receive public benefits, your income is below the threshold, or paying the fee would prevent you from meeting your household's basic needs.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/fw001.pdf", caseTypes: "both" as const },
  { id: "sc100a", number: "SC-100A", name: "Other Plaintiffs or Defendants", shortDesc: "Attach to SC-100 when your case has more than two plaintiffs or defendants.", detailDesc: "SC-100A is an attachment form used alongside SC-100 when there are more than two parties on either side of the case.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc100a.pdf", caseTypes: "both" as const },
  { id: "sc103", number: "SC-103", name: "Fictitious Business Name", shortDesc: "Required when a party is suing or being sued under a 'doing business as' (DBA) name.", detailDesc: "SC-103 must be attached to SC-100 or SC-120 whenever a plaintiff or defendant operates under a fictitious business name.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc103.pdf", caseTypes: "business" as const },
  { id: "sc105", number: "SC-105", name: "Request for Court Order and Answer", shortDesc: "Ask the court to issue a specific order before or after your trial.", detailDesc: "SC-105 is a two-part form for requesting court orders — for example, requesting more time, asking to amend the claim, or requesting a payment plan after judgment.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc105.pdf", caseTypes: "both" as const },
  { id: "sc112a", number: "SC-112A", name: "Proof of Service by Mail", shortDesc: "Proves that certain court documents were properly served by mailing them.", detailDesc: "SC-112A is used when specific forms are allowed to be served by mail rather than in person.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc112a.pdf", caseTypes: "both" as const },
  { id: "sc120", number: "SC-120", name: "Defendant's Claim and ORDER to Go to Small Claims Court", shortDesc: "Used by the defendant to file a counter-claim against the original plaintiff.", detailDesc: "SC-120 allows the defendant to file their own claim against the plaintiff in the same case.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc120.pdf", caseTypes: "both" as const },
  { id: "sc140", number: "SC-140", name: "Notice of Appeal", shortDesc: "File this to appeal a small claims judgment to the superior court.", detailDesc: "SC-140 is used when a party disagrees with the small claims court's decision and wants to appeal it to the superior court.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc140.pdf", caseTypes: "both" as const },
  { id: "sc150", number: "SC-150", name: "Request to Postpone Trial", shortDesc: "Ask the court to reschedule your hearing to a later date.", detailDesc: "SC-150 lets either a plaintiff or defendant formally request that the court move the trial to a different date.", available: true, blankFormUrl: "https://www.courts.ca.gov/documents/sc150.pdf", caseTypes: "both" as const },
];

const FORM_GUIDE_CONTENT: Record<string, { role: "primary"|"attachment"; effectiveDate: string; bestUse: string; whenToUse: string[]; whenNotToUse: string[]; haveReady: string[]; warnings: string[]; relatedForms: { number: string; reason: string }[] }> = {
  sc100: { role: "primary", effectiveDate: "January 1, 2026", bestUse: "Use this to open your California small claims case — fill it out completely and file it with the court clerk to get your hearing date.", whenToUse: ["You are a California resident or are suing someone in California who owes you money.", "Your claim is within the small claims dollar limit for your situation."], whenNotToUse: ["Your claim exceeds the small claims limit — file in a higher court instead.", "You are a business suing another business for more than $5,000."], haveReady: ["Your full legal name, address, and phone number.", "The defendant's full name and current address.", "The exact dollar amount you are claiming.", "A clear, factual statement of why the defendant owes you money."], warnings: ["Make sure you have the defendant's correct address — incorrect service can delay or dismiss your case.", "The $12,500 limit applies to most individuals; businesses are capped at $6,250.", "If your description is too long, attach MC-030 and note the attachment on SC-100."], relatedForms: [{ number: "MC-030", reason: "If your description needs more space" }, { number: "SC-100A", reason: "If you have more than two parties" }, { number: "FW-001", reason: "To waive filing fees if you qualify" }] },
  mc030: { role: "primary", effectiveDate: "January 1, 2006", bestUse: "Use this as a sworn written statement when another court form does not give enough space.", whenToUse: ["The main form is too short for the facts the court needs.", "A judge or clerk suggests attaching a declaration."], whenNotToUse: ["The main form has adequate space.", "You are trying to substitute a declaration for the correct main form."], haveReady: ["A clear heading showing which filing the declaration supports.", "Facts stated from your own personal knowledge.", "Your signature under penalty of perjury and the date signed."], warnings: ["Keep facts separate from opinions.", "A declaration can hurt clarity if it becomes too long."], relatedForms: [{ number: "MC-031", reason: "If more attachment pages are needed" }, { number: "SC-100", reason: "Main claim form this typically supports" }] },
  sc104: { role: "primary", effectiveDate: "January 1, 2009", bestUse: "Use this after a non-party adult personally serves the filed small claims papers.", whenToUse: ["A non-party adult (age 18+) personally handed the filed papers to the defendant.", "You need to show the court who served, when, and how."], whenNotToUse: ["You are proving mail service — a different form may be needed.", "You are trying to serve papers yourself — the plaintiff cannot serve their own papers."], haveReady: ["Server's full name, age, and address.", "The date, time, and place of service.", "The identity of the person who received the papers."], warnings: ["Service is a technical step — if done wrong, the hearing can be delayed or dismissed.", "The plaintiff cannot personally serve their own papers."], relatedForms: [{ number: "SC-112A", reason: "When later papers are served by mail instead" }] },
  fw001: { role: "primary", effectiveDate: "March 1, 2026", bestUse: "Use this before or at the time of filing SC-100 if you cannot afford the court filing fee without financial hardship.", whenToUse: ["You receive public benefits: Medi-Cal, CalWORKS, SSI/SSP, Food Stamps (CalFresh), IHSS, etc.", "Your gross monthly household income is below the threshold for your family size.", "You do not have enough income to pay for basic household needs and court fees."], whenNotToUse: ["You can afford the filing fee without financial hardship.", "Your case settled for $10,000 or more."], haveReady: ["Proof of public benefits if claiming eligibility.", "Monthly income figures for all household members.", "Monthly expense amounts and information about assets."], warnings: ["This form is confidential — the court will not give it to the other party.", "If your financial situation improves, you are required to notify the court.", "False statements on a fee waiver form are a criminal offense."], relatedForms: [{ number: "SC-100", reason: "File together with your claim" }, { number: "FW-001-INFO", reason: "Information sheet explaining eligibility rules" }] },
  sc100a: { role: "attachment", effectiveDate: "January 1, 2026", bestUse: "Attach to SC-100 when there are more than two parties on either side of your case.", whenToUse: ["You are suing three or more people or businesses.", "Three or more people are bringing the claim together."], whenNotToUse: ["You only have two parties total — SC-100 alone is sufficient."], haveReady: ["Full names and contact information for all additional parties.", "Each additional plaintiff must also sign."], warnings: ["Each additional plaintiff must sign and declare the information is true."], relatedForms: [{ number: "SC-100", reason: "Primary filing form" }] },
  sc103: { role: "attachment", effectiveDate: "January 1, 2026", bestUse: "Attach to SC-100 or SC-120 when a party is suing or being identified through a DBA name.", whenToUse: ["A sole proprietor or business uses a 'doing business as' (DBA) name.", "You want the court record to connect the brand name with the legal owner."], whenNotToUse: ["The business is already named by its full legal entity name."], haveReady: ["The exact fictitious business name as registered.", "County fictitious business name filing records."], warnings: ["A DBA is not a separate legal person.", "Collecting a judgment is much easier when the legal identity is correct from the start."], relatedForms: [{ number: "SC-100", reason: "Plaintiff claim form" }, { number: "SC-120", reason: "Defendant claim form" }] },
  sc105: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this to ask the judge to rule on a specific procedural issue before or after trial.", whenToUse: ["You need a court order connected to the small claims case.", "The other side already filed SC-105 and you need to respond."], whenNotToUse: ["You are simply asking to move the hearing date — SC-150 is more specific for that."], haveReady: ["The exact order you want the judge to make.", "A concise, facts-first explanation of why the order is needed."], warnings: ["This is not a general narrative form. Keep it focused on a specific request."], relatedForms: [{ number: "SC-150", reason: "To postpone the trial date instead" }, { number: "MC-030", reason: "If a longer sworn explanation is needed" }] },
  sc112a: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this to prove that later small claims papers were served by mail — required after filing.", whenToUse: ["The specific rules allow mail service for the document.", "A non-party adult completed the mailing and can sign under penalty of perjury."], whenNotToUse: ["You are proving personal service of the original claim — use SC-104 for that."], haveReady: ["The name and address of the person who mailed the papers.", "The date and place of mailing.", "A list of the exact documents that were mailed."], warnings: ["Not all papers can be mailed — the original claim must be personally served.", "Mail service has its own timing rules.", "The person who mails the papers CANNOT be a party to the case — it must be a neutral adult."], relatedForms: [{ number: "SC-104", reason: "When personal service was used instead" }] },
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
  sc100a: { title: "Other Plaintiffs or Defendants (SC-100A)", subtitle: "Add up to 2 additional plaintiffs and 1 additional defendant.", endpoint: "sc100a", filename: (id) => `SC100A-Case-${id}.pdf`, groups: [
    { title: "Additional Plaintiff #1", fields: [{ key: "p1_name", label: "Full Name", type: "text" }, { key: "p1_phone", label: "Phone Number", type: "text" }, { key: "p1_street", label: "Street Address", type: "text" }, { key: "p1_city", label: "City", type: "text" }, { key: "p1_state", label: "State", type: "text", placeholder: "CA" }, { key: "p1_zip", label: "ZIP", type: "text" }]},
    { title: "Additional Plaintiff #2 (optional)", fields: [{ key: "p2_name", label: "Full Name", type: "text" }, { key: "p2_phone", label: "Phone Number", type: "text" }, { key: "p2_street", label: "Street Address", type: "text" }, { key: "p2_city", label: "City", type: "text" }, { key: "p2_state", label: "State", type: "text", placeholder: "CA" }, { key: "p2_zip", label: "ZIP", type: "text" }]},
    { title: "Additional Defendant (optional)", fields: [{ key: "d1_name", label: "Full Name / Business Name", type: "text" }, { key: "d1_phone", label: "Phone Number", type: "text" }, { key: "d1_street", label: "Street Address", type: "text" }, { key: "d1_city", label: "City", type: "text" }, { key: "d1_state", label: "State", type: "text", placeholder: "CA" }, { key: "d1_zip", label: "ZIP", type: "text" }, { key: "d1_agentName", label: "Agent for Service Name (if corporation/LLC)", type: "text" }]},
  ]},
  sc103: { title: "Fictitious Business Name (SC-103)", subtitle: "Provide your DBA registration details.", endpoint: "sc103", filename: (id) => `SC103-Case-${id}.pdf`, groups: [
    { title: "Attachment", fields: [{ key: "attachedTo", label: "Attach to", type: "select", required: true, options: [{ value: "sc100", label: "SC-100 (Plaintiff's Claim)" }, { value: "sc120", label: "SC-120 (Defendant's Claim)" }] }]},
    { title: "Business Information", fields: [{ key: "businessName", label: "Business Name (DBA)", type: "text", required: true }, { key: "businessAddress", label: "Business Address (no P.O. Box)", type: "text", required: true }, { key: "mailingAddress", label: "Mailing Address (if different)", type: "text" }, { key: "businessType", label: "Business Type", type: "select", required: true, options: [{ value: "individual", label: "Individual" }, { value: "association", label: "Association" }, { value: "partnership", label: "Partnership" }, { value: "corporation", label: "Corporation" }, { value: "llc", label: "Limited Liability Company (LLC)" }, { value: "other", label: "Other" }] }, { key: "businessTypeOther", label: "If Other, specify", type: "text" }]},
    { title: "Fictitious Business Name Statement", fields: [{ key: "fbnCounty", label: "County where FBN Statement was filed", type: "text", required: true }, { key: "fbnNumber", label: "FBN Statement Number", type: "text", required: true }, { key: "fbnExpiry", label: "Expiration Date of FBN Statement", type: "date", required: true }, { key: "signerName", label: "Name and Title of Signer", type: "text" }, { key: "signDate", label: "Date Signed", type: "date" }]},
  ]},
  sc104: { title: "Proof of Service (SC-104)", subtitle: "To be completed by the person who served the court papers — not you.", endpoint: "sc104", filename: (id) => `SC104-Case-${id}.pdf`, groups: [
    { title: "Hearing Information", fields: [{ key: "courtStreet", label: "Court Street Address", type: "text" }, { key: "hearingDate", label: "Hearing Date", type: "date" }, { key: "hearingTime", label: "Hearing Time", type: "text", placeholder: "e.g. 9:00 a.m." }, { key: "hearingDept", label: "Department", type: "text", placeholder: "e.g. 97" }]},
    { title: "Who Was Served (Item 1)", fields: [{ key: "personServedName", label: "Person served (if serving a person)", type: "text" }, { key: "businessName", label: "Business/entity served (if serving a business)", type: "text" }, { key: "authorizedPerson", label: "Person authorized to accept service", type: "text" }, { key: "authorizedTitle", label: "Their job title", type: "text" }]},
    { title: "Documents Served (Item 3)", fields: [{ key: "docsServed_sc100", label: "SC-100 (Plaintiff's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] }, { key: "docsServed_sc120", label: "SC-120 (Defendant's Claim)", type: "select", options: [{ value: "yes", label: "Yes — served this" }, { value: "no", label: "No" }] }, { key: "docsServedOther", label: "Other documents (describe)", type: "text" }]},
    { title: "How Service Was Made (Item 4)", fields: [{ key: "serviceMethod", label: "Service method", type: "select", required: true, options: [{ value: "personal", label: "Personal Service (handed directly to person)" }, { value: "substituted", label: "Substituted Service (left with another adult)" }] }, { key: "serviceDate", label: "Date of service", type: "date", required: true }, { key: "serviceTime", label: "Time of service", type: "text", placeholder: "e.g. 2:30 p.m." }, { key: "serviceAddress", label: "Address where served", type: "text" }]},
    { title: "Server Information", fields: [{ key: "serverName", label: "Server's full name", type: "text", required: true }, { key: "serverAddress", label: "Server's address", type: "text" }, { key: "serverCity", label: "City", type: "text" }, { key: "serverState", label: "State", type: "text", placeholder: "CA" }, { key: "signDate", label: "Date signed by server", type: "date" }]},
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
  sc150: { title: "Request to Postpone Trial (SC-150)", subtitle: "Ask the court to reschedule your hearing.", endpoint: "sc150", filename: (id) => `SC150-Case-${id}.pdf`, groups: [
    { title: "Court Information", fields: [{ key: "courtStreet", label: "Court Street Address", type: "text" }]},
    { title: "Your Information (Item 1)", fields: [{ key: "requestingPartyName", label: "Your full name", type: "text", required: true }, { key: "requestingPartyAddress", label: "Your mailing address", type: "text" }, { key: "requestingPartyPhone", label: "Your phone number", type: "text" }, { key: "requestingPartyRole", label: "You are a", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] }]},
    { title: "Trial Dates", fields: [{ key: "currentTrialDate", label: "My trial is now scheduled for (Item 2)", type: "date", required: true }, { key: "postponeUntilDate", label: "I ask the court to postpone until (approximately) (Item 3)", type: "date" }]},
    { title: "Reasons", fields: [{ key: "postponeReason", label: "I am asking for this postponement because (Item 4)", type: "textarea", required: true, placeholder: "Explain why you need a postponement..." }, { key: "withinTenDaysReason", label: "If trial is within 10 days — why didn't you ask sooner? (Item 5)", type: "textarea", placeholder: "Only fill this in if your trial is within the next 10 days..." }, { key: "signDate", label: "Date signed", type: "date" }]},
  ]},
};

// ─── Form Assistant Modal ──────────────────────────────────────────────────────
function FormAssistantModal({ formId, caseId, initialValues, onClose, onDownload, onAiGenerate }: {
  formId: string; caseId: number; initialValues?: Record<string, string>;
  onClose: () => void;
  onDownload: (endpoint: string, filename: string, body: Record<string, any>) => void;
  onAiGenerate?: () => Promise<string | null>;
}) {
  const cfg = FORM_FIELD_CONFIG[formId];
  const [formData, setFormData] = useState<Record<string, string>>(() => initialValues ?? {});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (!cfg) return null;

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

  function buildBody(): Record<string, any> {
    const d: Record<string, any> = { ...formData };
    if (formId === "sc100a") {
      d.additionalPlaintiffs = [1, 2].map(n => ({
        name: formData[`p${n}_name`] || "", phone: formData[`p${n}_phone`] || "",
        street: formData[`p${n}_street`] || "", city: formData[`p${n}_city`] || "",
        state: formData[`p${n}_state`] || "CA", zip: formData[`p${n}_zip`] || "",
      })).filter(p => p.name);
      d.additionalDefendants = [{ name: formData.d1_name || "", phone: formData.d1_phone || "", street: formData.d1_street || "", city: formData.d1_city || "", state: formData.d1_state || "CA", zip: formData.d1_zip || "", agentName: formData.d1_agentName || "" }].filter(p => p.name);
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
    return d;
  }

  function handleSubmit() {
    const required = cfg.groups.flatMap(g => g.fields).filter(f => f.required);
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
          {cfg.groups.map((group) => (
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
export function SignaturePadModal({ open, onClose, onSign, onSkipSign }: { open: boolean; onClose: () => void; onSign: (dataUrl: string) => void; onSkipSign: () => void }) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-primary" />Sign Your SC-100</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Draw your signature below using your mouse or finger.</p>
        </DialogHeader>
        <div className="rounded-xl border-2 border-dashed border-input bg-[#fdfdfc] relative overflow-hidden" style={{ touchAction: "none" }}>
          <canvas ref={canvasRef} width={680} height={160} className="w-full cursor-crosshair" style={{ display: "block" }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
          <div className="absolute bottom-8 left-8 right-8 border-b border-gray-300 pointer-events-none" />
          {!hasDrawn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><p className="text-muted-foreground/40 text-sm select-none">Sign here ↑</p></div>}
        </div>
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 leading-relaxed">By signing, you declare under penalty of perjury under the laws of the State of California that the information on your SC-100 is true and correct.</p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={clearCanvas} disabled={!hasDrawn} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />Clear</Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onSkipSign}>Skip — Download Without Signature</Button>
            <Button onClick={handleSign} disabled={!hasDrawn} className="gap-2 bg-[#0d6b5e] hover:bg-[#0a5549] text-white">
              <Download className="h-4 w-4" />Sign &amp; Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Phase Header ─────────────────────────────────────────────────────────────
function PhaseHeader({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
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
export function FormsTab({ caseId, currentCase, onSwitchToIntake, onSwitchToPrep }: { caseId: number, currentCase: any, onSwitchToIntake: () => void, onSwitchToPrep: () => void }) {
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
  const [sigModalOpen, setSigModalOpen] = useState(false);

  // ── MC-030 inline editor state ─────────────────────────────────────────────
  const [mc030Title, setMc030Title] = useState("");
  const [mc030Text, setMc030Text] = useState("");
  const [mc030AiGenerating, setMc030AiGenerating] = useState(false);
  const [mc030AiError, setMc030AiError] = useState<string | null>(null);
  const [selectedExhibits, setSelectedExhibits] = useState<number[]>([]);
  const [buildingPacket, setBuildingPacket] = useState(false);

  // ── Documents for exhibit selector ────────────────────────────────────────
  const [documents, setDocuments] = useState<any[]>([]);
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
  }, [caseId]);

  useEffect(() => {
    if (downloadError) { toast({ title: "Download failed", description: downloadError, variant: "destructive" }); setDownloadError(null); }
  }, [downloadError, toast]);

  const score = readiness?.score ?? currentCase.readinessScore ?? 0;
  const isReady = score >= 80;
  const descriptionNeedsMC030 = (currentCase.claimDescription?.length ?? 0) > 650;
  const isBusinessCase: boolean | null = currentCase.defendantIsBusinessOrEntity ?? null;
  const intakeStarted = currentCase.intakeStep != null && currentCase.intakeStep > 1;
  const isSuingPublicEntity = currentCase.isSuingPublicEntity === true;
  const claimAmount = Number(currentCase.claimAmount || 0);

  // Phase 2 visibility
  const showSC100A = true;
  const showSC103 = isBusinessCase === true;
  const showPublicEntityBlock = isSuingPublicEntity;
  const showLimitWarning = claimAmount > 10000;
  const showPhase2 = showSC100A || showSC103 || showPublicEntityBlock || showLimitWarning;

  // Library forms (all except sc100, mc030, sc112a which have their own sections)
  const PHASE1_IDS = ["sc100", "mc030"];
  const PHASE3_IDS = ["sc112a"];
  const LIBRARY_IDS = ["fw001", "sc100a", "sc103", "sc104", "sc105", "sc120", "sc140", "sc150"];
  const libraryForms = FORMS_CATALOG.filter(f => LIBRARY_IDS.includes(f.id));

  const guideDialogForm = FORMS_CATALOG.find(f => f.id === guideDialogFormId) ?? null;

  // ── Download utilities ─────────────────────────────────────────────────────
  async function downloadForm(endpoint: string, filename: string, setLoading: (v: boolean) => void) {
    setLoading(true); setDownloadError(null);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const a = document.createElement("a");
      a.href = `/api/cases/${caseId}/forms/${endpoint}?token=${encodeURIComponent(token)}`;
      a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch { setDownloadError("Download failed — please try again."); }
    finally { setLoading(false); }
  }

  async function downloadFormPost(endpoint: string, filename: string, body: Record<string, any>) {
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

  async function generateMC030Declaration(): Promise<string | null> {
    setMc030AiGenerating(true); setMc030AiError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-ai`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` }, body: JSON.stringify({}) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setMc030AiError(err.error || "AI generation failed."); return null; }
      const data = await res.json();
      const text = data.declarationText ?? null;
      if (text) setMc030Text(text);
      return text;
    } catch { setMc030AiError("AI generation failed — please try again."); return null; }
    finally { setMc030AiGenerating(false); }
  }

  async function downloadMC030Packet() {
    if (!mc030Text.trim()) { toast({ title: "Declaration required", description: "Please write or generate your declaration text first.", variant: "destructive" }); return; }
    setBuildingPacket(true);
    try {
      const clerkToken = await getToken();
      const tokenRes = await fetch(`/api/cases/${caseId}/forms/download-token`, { method: "POST", headers: { Authorization: `Bearer ${clerkToken}` } });
      if (!tokenRes.ok) { setDownloadError("Could not authorize download — please try again."); return; }
      const { token } = await tokenRes.json();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-with-exhibits`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, declarationTitle: mc030Title || undefined, declarationText: mc030Text, exhibitDocIds: selectedExhibits }),
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

  function toggleExhibit(docId: number) {
    setSelectedExhibits(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  }

  function openSC112A() {
    const defAddr = [currentCase.defendantAddress, currentCase.defendantCity, currentCase.defendantState, currentCase.defendantZip].filter(Boolean).join(", ");
    setModalInitialValues({
      party1Name: currentCase.defendantName || "",
      party1Address: defAddr,
    });
    setModalFormId("sc112a");
  }

  const EXHIBIT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* ── PHASE 1: Filing Package ────────────────────────────────────────── */}
      <section>
        <PhaseHeader
          number={1}
          title="Filing Package"
          subtitle="Complete and download these two forms to file your small claims case with the court."
        />

        <div className="space-y-4 pl-0 sm:pl-14">

          {/* SC-100 Card */}
          <div className={`rounded-xl border-2 p-5 bg-card transition-all ${isReady ? "border-[#0d6b5e]/50 bg-[#f0fffe]/40" : "border-border"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">SC-100</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Step 1 — Start Here</span>
                {isReady && <span className="flex items-center gap-1 text-[10px] font-bold text-[#0d6b5e]"><CheckCircle2 className="h-3 w-3" />Ready to file</span>}
              </div>
              <a href="https://www.courts.ca.gov/documents/sc100.pdf" target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
            </div>
            <h4 className="font-semibold text-sm leading-tight mb-1">Plaintiff's Claim and ORDER to Go to Small Claims Court</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">This is your main filing form. Your name, the defendant's name and address, claim amount, and why you're owed money are all pre-filled from your intake.</p>
            {descriptionNeedsMC030 && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 mb-3">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-500" />
                Your description is long — the PDF will include a note to see the attached MC-030 Declaration (Step 1B below).
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={() => setSigModalOpen(true)} disabled={downloadingPdf}>
                {downloadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <PenLine className="h-3 w-3" />}Sign &amp; Download SC-100
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3" onClick={() => setGuideDialogFormId("sc100")}>
                <Info className="h-3 w-3" />How to Fill This
              </Button>
            </div>
          </div>

          {/* MC-030 + Exhibits inline card */}
          <div className="rounded-xl border-2 border-border p-5 bg-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">MC-030</span>
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#0d6b5e]/10 text-[#0d6b5e] border border-[#0d6b5e]/20">Step 1B — Declaration + Exhibits</span>
                {descriptionNeedsMC030 && <Badge variant="destructive" className="text-[10px] py-0">Required</Badge>}
              </div>
              <a href="https://www.courts.ca.gov/documents/mc030.pdf" target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
            </div>
            <h4 className="font-semibold text-sm leading-tight mb-1">Sworn Declaration + Attached Evidence</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Write your sworn statement under penalty of perjury. Select documents from your uploads to attach as labeled exhibits (Exhibit A, B, C…) — all bundled into one PDF.
            </p>

            {/* Declaration title */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-foreground block mb-1">Declaration Title <span className="font-normal text-muted-foreground">(optional)</span></label>
              <input type="text" value={mc030Title} onChange={e => setMc030Title(e.target.value)}
                placeholder="e.g. Declaration of Jane Doe in Support of Claim"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent" />
            </div>

            {/* Declaration text */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-foreground block mb-1">Sworn Statement <span className="text-rose-500">*</span></label>
              <textarea value={mc030Text} onChange={e => setMc030Text(e.target.value)}
                placeholder="Write your declaration here. Use numbered paragraphs: '1. On January 15, 2025, I paid defendant $2,400 for…'"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent resize-none" rows={6} />
              <div className="mt-1.5 flex items-center gap-2">
                <button onClick={generateMC030Declaration} disabled={mc030AiGenerating}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0d6b5e]/10 text-[#0d6b5e] hover:bg-[#0d6b5e]/20 transition-colors disabled:opacity-50">
                  {mc030AiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {mc030AiGenerating ? "Writing declaration…" : "AI Draft Declaration"}
                </button>
                {mc030AiError && <p className="text-xs text-rose-600">{mc030AiError}</p>}
              </div>
            </div>

            {/* Exhibit selector */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Attach Exhibits from Your Uploads</span>
                {documents.length > 0 && <span className="text-[10px] text-muted-foreground">({selectedExhibits.length} selected)</span>}
              </div>
              {docsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" />Loading uploaded documents…</div>
              ) : documents.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 leading-relaxed">
                  No documents uploaded yet. Upload evidence in the Documents tab to include exhibits here.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border border-border p-2">
                  {documents.map((doc: any, idx: number) => {
                    const selectedIdx = selectedExhibits.indexOf(doc.id);
                    const isSelected = selectedIdx !== -1;
                    const exhibitLetter = isSelected ? EXHIBIT_LETTERS[selectedIdx] ?? String(selectedIdx + 1) : null;
                    return (
                      <label key={doc.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[#0d6b5e]/8 border border-[#0d6b5e]/25" : "hover:bg-muted/50 border border-transparent"}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleExhibit(doc.id)} className="rounded border-input h-4 w-4 accent-[#0d6b5e]" />
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-xs text-foreground truncate flex-1">{doc.originalName || doc.filename}</span>
                        {exhibitLetter && (
                          <span className="shrink-0 text-[10px] font-black bg-[#0d6b5e] text-white px-1.5 py-0.5 rounded-full">EXHIBIT {exhibitLetter}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={downloadMC030Packet} disabled={buildingPacket || !mc030Text.trim()}>
                {buildingPacket ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                {buildingPacket ? "Building packet…" : selectedExhibits.length > 0 ? `Build Filing Packet (MC-030 + ${selectedExhibits.length} Exhibit${selectedExhibits.length > 1 ? "s" : ""})` : "Download MC-030"}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3" onClick={() => setGuideDialogFormId("mc030")}>
                <Info className="h-3 w-3" />How to Fill This
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* ── PHASE 2: Additional Forms (conditional) ───────────────────────── */}
      {showPhase2 && (
        <section>
          <PhaseHeader
            number={2}
            title="Additional Required Forms"
            subtitle="Based on your case details, one or more of the following may apply to you."
          />
          <div className="space-y-3 pl-0 sm:pl-14">

            {showPublicEntityBlock && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-rose-300 bg-rose-50 p-4">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-rose-900 mb-1">Special Rules — Suing a Government Agency</h4>
                  <p className="text-sm text-rose-800 leading-relaxed">You must file a government tort claim form (Gov. Code § 910) and wait for rejection before filing in small claims court. This is a required first step and must be completed before submitting your SC-100.</p>
                </div>
              </div>
            )}

            {showLimitWarning && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900 mb-1">Claim Near the Limit — ${claimAmount.toLocaleString()}</h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    {claimAmount > 12500
                      ? "Your claim amount exceeds $12,500. Individual plaintiffs are capped at $12,500 in small claims court. You may need to reduce your claim or file in a higher court."
                      : "Your claim is approaching the small claims limit. Businesses are capped at $6,250. Make sure your final claim amount fits within the limits for your situation."}
                  </p>
                </div>
              </div>
            )}

            {showSC103 && (
              <div className={`rounded-xl border-2 border-orange-300 bg-orange-50/40 p-4`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">SC-103</span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">Required — DBA</span>
                  </div>
                  <a href="https://www.courts.ca.gov/documents/sc103.pdf" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
                </div>
                <h4 className="font-semibold text-sm mb-1">Fictitious Business Name Attachment</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">The defendant appears to operate under a business name. SC-103 connects the DBA name to the legal owner and must be attached to your SC-100.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 border-orange-400 text-orange-800 hover:bg-orange-100"
                    onClick={() => { setModalInitialValues({}); setModalFormId("sc103"); }} disabled={downloadingForm === "sc103"}>
                    {downloadingForm === "sc103" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Download SC-103
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setGuideDialogFormId("sc103")}><Info className="h-3 w-3" />Guide</Button>
                </div>
              </div>
            )}

            {showSC100A && (
              <div className="rounded-xl border-2 border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">SC-100A</span>
                    <span className="text-[10px] font-medium text-muted-foreground">If you have more than 2 parties</span>
                  </div>
                  <a href="https://www.courts.ca.gov/documents/sc100a.pdf" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
                </div>
                <h4 className="font-semibold text-sm mb-1">Other Plaintiffs or Defendants</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">If your case involves more than two parties total, attach this form to your SC-100. It adds space for up to two additional plaintiffs and one additional defendant.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2"
                    onClick={() => { setModalInitialValues({}); setModalFormId("sc100a"); }} disabled={downloadingForm === "sc100a"}>
                    {downloadingForm === "sc100a" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Download SC-100A
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setGuideDialogFormId("sc100a")}><Info className="h-3 w-3" />Guide</Button>
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* ── PHASE 3: Service of Process ───────────────────────────────────── */}
      <section>
        <PhaseHeader
          number={showPhase2 ? 3 : 2}
          title="Service of Process"
          subtitle="After filing, you must have the defendant served and prove it to the court. This step is mandatory."
        />
        <div className="space-y-4 pl-0 sm:pl-14">

          {/* Service method guide */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-[#0d6b5e]/10 flex items-center justify-center mt-0.5">
                <Mail className="h-4 w-4 text-[#0d6b5e]" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1.5">How to Serve Your Defendant in California</h4>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p><span className="font-semibold text-foreground">Personal Service (required for SC-100):</span> A non-party adult (not you) must hand the court papers directly to the defendant, or leave them with a responsible person at their home or business. This is the only valid method for the initial SC-100.</p>
                  <p><span className="font-semibold text-foreground">Service by Mail (for later documents):</span> After filing, some documents like SC-105 and SC-150 may be served by mailing. A non-party adult mails the papers and completes SC-112A.</p>
                  <p><span className="font-semibold text-foreground">Timing:</span> The defendant must be served at least 15 days before the hearing (30 days if they live outside the county). Check with your courthouse for exact deadlines.</p>
                </div>
              </div>
            </div>
          </div>

          {/* SC-112A card — MANDATORY */}
          <div className="rounded-xl border-2 border-[#0d6b5e]/40 bg-[#f0fffe]/40 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#0d6b5e] text-white">SC-112A</span>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#0d6b5e]/15 text-[#0d6b5e] border border-[#0d6b5e]/30">
                  <CheckCircle2 className="h-2.5 w-2.5" />Mandatory — Proof of Mail Service
                </span>
              </div>
              <a href="https://www.courts.ca.gov/documents/sc112a.pdf" target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
            </div>
            <h4 className="font-semibold text-sm leading-tight mb-1">Proof of Service by Mail</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              This form must be completed by the person who mailed the court papers — <span className="font-semibold text-foreground">not you</span>. It proves to the court that the defendant received the documents. The defendant's name and address are pre-filled from your intake.
            </p>
            {!currentCase.caseNumber && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-3">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                Your case number isn't in the system yet — it will be assigned when you file at the courthouse. Write it in on the form after you receive it.
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button className="gap-1.5 bg-[#0d6b5e] hover:bg-[#0a5549] text-white h-8 text-xs px-3"
                onClick={openSC112A} disabled={downloadingForm === "sc112a"}>
                {downloadingForm === "sc112a" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Fill Out &amp; Download SC-112A
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3" onClick={() => setGuideDialogFormId("sc112a")}>
                <Info className="h-3 w-3" />How to Fill This
              </Button>
            </div>
          </div>

          {/* SC-104 mention */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">SC-104 Proof of Service</span> is used to prove personal service of the original SC-100 (not mail service). Find it in the Forms Library below, or ask the person who serves the defendant to complete it.
            </p>
          </div>

        </div>
      </section>

      {/* ── Forms Library (less-common forms) ─────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-bold text-foreground">Additional Forms Library</h3>
          <span className="text-xs text-muted-foreground">Other California small claims forms you may need</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 sm:pl-8">
          {libraryForms.map((form) => (
            <div key={form.id} className={`relative flex flex-col rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-md bg-card hover:border-[#0d6b5e]/40 ${form.id === "sc103" && isBusinessCase ? "border-orange-400 bg-orange-50/30" : "border-border"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{form.number}</span>
                  {form.id === "sc103" && isBusinessCase && <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">Required</span>}
                </div>
                <a href={form.blankFormUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank ↗</a>
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1">{form.name}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">{form.shortDesc}</p>
              <div className="flex gap-2 flex-wrap">
                {form.available && (
                  FORM_FIELD_CONFIG[form.id] ? (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2"
                      onClick={() => { setModalInitialValues({}); setModalFormId(form.id); }} disabled={downloadingForm === form.id}>
                      {downloadingForm === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}Download PDF
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" disabled title="Coming soon">
                      <Download className="h-3 w-3" />Download PDF
                    </Button>
                  )
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setGuideDialogFormId(form.id)}>
                  <Info className="h-3 w-3" />How to Fill This
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modalFormId && (
        <FormAssistantModal
          key={`${modalFormId}-${JSON.stringify(modalInitialValues)}`}
          formId={modalFormId}
          caseId={caseId}
          initialValues={modalInitialValues}
          onClose={() => setModalFormId(null)}
          onDownload={downloadFormPost}
          onAiGenerate={modalFormId === "mc030" ? generateMC030Declaration : undefined}
        />
      )}

      <SignaturePadModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSign={(dataUrl) => { setSigModalOpen(false); downloadForm(`sc100?signatureDataUrl=${encodeURIComponent(dataUrl)}`, `SC100-Case-${caseId}.pdf`, setDownloadingPdf); }}
        onSkipSign={() => { setSigModalOpen(false); downloadForm("sc100", `SC100-Case-${caseId}.pdf`, setDownloadingPdf); }}
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
                    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center gap-2 py-10 px-4">
                      <svg className="text-muted-foreground/40" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                      <p className="text-sm font-medium text-muted-foreground">Video guide — coming soon</p>
                    </div>
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
                        {guideDialogForm.id === "sc100" && descriptionNeedsMC030 && (
                          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-5 space-y-2">
                            <div className="flex items-start gap-3">
                              <svg className="mt-0.5 shrink-0 text-blue-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <div>
                                <h3 className="text-sm font-bold text-blue-900">Your description is too long — MC-030 is required</h3>
                                <p className="text-sm text-blue-800 leading-relaxed">Your SC-100 PDF will include the first 7 lines and a note directing the court to the attached MC-030 Declaration. File both forms together.</p>
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

    </div>
  );
}

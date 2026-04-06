import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useGetCaseReadiness } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gavel, Download, Info, Loader2, PenLine, RotateCcw } from "lucide-react";
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
  sc112a: { role: "primary", effectiveDate: "July 1, 2025", bestUse: "Use this to prove that later small claims papers were served by mail.", whenToUse: ["The specific rules allow mail service for the document.", "A non-party adult completed the mailing and can sign under penalty of perjury."], whenNotToUse: ["You are proving personal service of the original claim — use SC-104 for that."], haveReady: ["The name and address of the person who mailed the papers.", "The date and place of mailing.", "A list of the exact documents that were mailed."], warnings: ["Not all papers can be mailed — the original claim must be personally served.", "Mail service has its own timing rules."], relatedForms: [{ number: "SC-104", reason: "When personal service was used instead" }] },
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
  sc150: { title: "Request to Postpone Trial (SC-150)", subtitle: "Ask the court to reschedule your hearing.", endpoint: "sc150", filename: (id) => `SC150-Case-${id}.pdf`, groups: [
    { title: "Court Information", fields: [{ key: "courtStreet", label: "Court Street Address", type: "text" }]},
    { title: "Your Information (Item 1)", fields: [{ key: "requestingPartyName", label: "Your full name", type: "text", required: true }, { key: "requestingPartyAddress", label: "Your mailing address", type: "text" }, { key: "requestingPartyPhone", label: "Your phone number", type: "text" }, { key: "requestingPartyRole", label: "You are a", type: "select", required: true, options: [{ value: "plaintiff", label: "Plaintiff" }, { value: "defendant", label: "Defendant" }] }]},
    { title: "Trial Dates", fields: [{ key: "currentTrialDate", label: "My trial is now scheduled for (Item 2)", type: "date", required: true }, { key: "postponeUntilDate", label: "I ask the court to postpone until (approximately) (Item 3)", type: "date" }]},
    { title: "Reasons", fields: [{ key: "postponeReason", label: "I am asking for this postponement because (Item 4)", type: "textarea", required: true, placeholder: "Explain why you need a postponement..." }, { key: "withinTenDaysReason", label: "If trial is within 10 days — why didn't you ask sooner? (Item 5)", type: "textarea", placeholder: "Only fill this in if your trial is within the next 10 days..." }, { key: "signDate", label: "Date signed", type: "date" }]},
  ]},
};

// ─── Form Assistant Modal ──────────────────────────────────────────────────────
function FormAssistantModal({ formId, caseId, onClose, onDownload, onAiGenerate }: { formId: string; caseId: number; onClose: () => void; onDownload: (endpoint: string, filename: string, body: Record<string, any>) => void; onAiGenerate?: () => Promise<string | null> }) {
  const cfg = FORM_FIELD_CONFIG[formId];
  const [formData, setFormData] = useState<Record<string, string>>({});
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
      const makePl = (prefix: string) => { const name = formData[`${prefix}_name`]; if (!name) return null; return { name, phone: formData[`${prefix}_phone`], street: formData[`${prefix}_street`], city: formData[`${prefix}_city`], state: formData[`${prefix}_state`] || "CA", zip: formData[`${prefix}_zip`] }; };
      const makeDef = (prefix: string) => { const name = formData[`${prefix}_name`]; if (!name) return null; return { name, phone: formData[`${prefix}_phone`], street: formData[`${prefix}_street`], city: formData[`${prefix}_city`], state: formData[`${prefix}_state`] || "CA", zip: formData[`${prefix}_zip`], agentName: formData[`${prefix}_agentName`] }; };
      d.additionalPlaintiffs = [makePl("p1"), makePl("p2")].filter(Boolean);
      d.additionalDefendants = [makeDef("d1")].filter(Boolean);
    }
    if (formId === "sc104") {
      const docs: string[] = [];
      if (formData["docsServed_sc100"] === "yes") docs.push("sc100");
      if (formData["docsServed_sc120"] === "yes") docs.push("sc120");
      if (formData["docsServedOther"]) docs.push("other");
      d.docsServed = docs;
    }
    return d;
  }

  function handleSubmit() {
    const requiredFields: string[] = [];
    for (const group of cfg.groups) {
      for (const field of group.fields) {
        if (field.required && !formData[field.key]) requiredFields.push(field.label);
      }
    }
    if (requiredFields.length > 0) { setValidationMsg(`Please fill in: ${requiredFields.join(", ")}`); return; }
    setValidationMsg(null);
    onDownload(cfg.endpoint, cfg.filename(caseId), buildBody());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold leading-tight">{cfg.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {formId === "mc030" && onAiGenerate && (
            <div className="rounded-xl border-2 border-[#0d6b5e]/30 bg-[#ddf6f3]/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 shrink-0 text-[#0d6b5e]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold text-[#0d6b5e]">AI Declaration Generator</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Click to auto-generate a complete, court-ready declaration based on your case details.</p>
                </div>
              </div>
              {aiError && <p className="text-xs text-rose-600 font-semibold">{aiError}</p>}
              <button onClick={handleAiGenerate} disabled={aiGenerating} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d6b5e] text-white text-sm font-semibold hover:bg-[#0d6b5e]/90 transition-colors disabled:opacity-60">
                {aiGenerating ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Generating…</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI Generate Declaration</>}
              </button>
            </div>
          )}
          {cfg.groups.map((group, gi) => (
            <div key={gi} className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0d6b5e]">{group.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-foreground mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
                    {field.hint && <p className="text-xs text-muted-foreground mb-1">{field.hint}</p>}
                    {field.type === "textarea" ? (
                      <textarea rows={field.key === "declarationText" ? 10 : 4} placeholder={field.placeholder} value={formData[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40" />
                    ) : field.type === "select" ? (
                      <select value={formData[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40">
                        <option value="">— select —</option>
                        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input type={field.type === "date" ? "date" : "text"} placeholder={field.placeholder} value={formData[field.key] || ""} onChange={(e) => set(field.key, e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6b5e]/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {validationMsg && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{validationMsg}</div>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-[#0d6b5e] text-white text-sm font-semibold hover:bg-[#0d6b5e]/90 transition-colors flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Generate PDF
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

// ─── Forms Tab ────────────────────────────────────────────────────────────────
export function FormsTab({ caseId, currentCase, onSwitchToIntake, onSwitchToPrep }: { caseId: number, currentCase: any, onSwitchToIntake: () => void, onSwitchToPrep: () => void }) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { data: readiness } = useGetCaseReadiness(caseId, { query: { enabled: !!caseId } });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [guideDialogFormId, setGuideDialogFormId] = useState<string | null>(null);
  const [modalFormId, setModalFormId] = useState<string | null>(null);
  const [downloadingForm, setDownloadingForm] = useState<string | null>(null);
  const [mc030Generating, setMc030Generating] = useState(false);
  const [mc030GenError, setMc030GenError] = useState<string | null>(null);
  const [sigModalOpen, setSigModalOpen] = useState(false);

  useEffect(() => {
    if (downloadError) { toast({ title: "Download failed", description: downloadError, variant: "destructive" }); setDownloadError(null); }
  }, [downloadError, toast]);

  const descriptionNeedsMC030 = (currentCase.claimDescription?.length ?? 0) > 650;

  async function generateMC030Declaration(): Promise<string | null> {
    setMc030Generating(true); setMc030GenError(null);
    try {
      const clerkToken = await getToken();
      const res = await fetch(`/api/cases/${caseId}/forms/mc030-ai`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${clerkToken}` }, body: JSON.stringify({}) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setMc030GenError(err.error || "AI generation failed."); return null; }
      const data = await res.json();
      return data.declarationText ?? null;
    } catch { setMc030GenError("AI generation failed — please try again."); return null; }
    finally { setMc030Generating(false); }
  }

  const score = readiness?.score ?? currentCase.readinessScore ?? 0;
  const isReady = score >= 80;
  const isBusinessCase: boolean | null = currentCase.defendantIsBusinessOrEntity ?? null;
  const intakeStarted = currentCase.intakeStep != null && currentCase.intakeStep > 1;

  const filteredForms = FORMS_CATALOG.filter((form) => {
    if (isBusinessCase === null || !intakeStarted) return true;
    if (isBusinessCase) return form.caseTypes === "both" || form.caseTypes === "business";
    return form.caseTypes === "both" || form.caseTypes === "personal";
  });

  const guideDialogForm = FORMS_CATALOG.find(f => f.id === guideDialogFormId) ?? null;

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

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-amber-500 flex items-center justify-center shadow-md"><Gavel className="h-7 w-7 text-white" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-amber-900 text-base">Practice Before Your Hearing</h3>
            <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">New</span>
          </div>
          <p className="text-sm text-amber-800">The Hearing Prep Coach acts as a real judge — asking you the same questions you'll face in court.</p>
        </div>
        <Button onClick={onSwitchToPrep} className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white gap-2 font-semibold"><Gavel className="h-4 w-4" />Start Practice</Button>
      </div>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-2xl font-bold">Court Forms Library</h2>
          <p className="text-muted-foreground text-sm">California small claims forms — click any form to learn more or generate it.</p>
        </div>
        {!intakeStarted ? (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Showing all forms — complete intake for a personalized list
          </div>
        ) : isBusinessCase ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#0d6b5e]/30 bg-[#ddf6f3] px-3 py-1 text-xs font-semibold text-[#0d6b5e]">Showing forms for: Business / Entity case</div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-[#0d6b5e]/30 bg-[#ddf6f3] px-3 py-1 text-xs font-semibold text-[#0d6b5e]">Showing forms for: Personal case</div>
        )}
      </div>

      {!intakeStarted && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 shrink-0 text-amber-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Complete your case intake to see only the forms that apply to your situation.
        </div>
      )}

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Case at a Glance</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Plaintiff</span>{currentCase.plaintiffName || "—"}</div>
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Defendant</span>{currentCase.defendantName || "—"}</div>
            <div><span className="font-semibold block text-xs text-muted-foreground uppercase">Incident Date</span>{currentCase.incidentDate || "—"}</div>
            <div className="col-span-2 sm:col-span-3"><span className="font-semibold block text-xs text-muted-foreground uppercase">Why does defendant owe you money?</span>{currentCase.claimDescription || "—"}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredForms.map((form) => (
          <div key={form.id} className={`relative flex flex-col rounded-xl border-2 p-4 transition-all duration-150 hover:shadow-md bg-card hover:border-[#0d6b5e]/40 ${form.id === "sc103" && isBusinessCase ? "border-orange-400 bg-orange-50/30" : "border-border"}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{form.number}</span>
                {form.id === "sc100" && <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Start Here</span>}
                {form.id === "mc030" && descriptionNeedsMC030 && <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Needed</span>}
                {form.id === "sc103" && isBusinessCase && <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">Required</span>}
              </div>
              <a href={form.blankFormUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[10px] text-muted-foreground hover:text-primary underline whitespace-nowrap">Blank form ↗</a>
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-1">{form.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">{form.shortDesc}</p>
            <div className="flex gap-2 flex-wrap">
              {form.available && (
                form.id === "sc100" ? (
                  <Button variant="outline" size="sm" className={`h-7 text-xs gap-1 px-2 ${isReady ? "border-[#0d6b5e] text-[#0d6b5e] hover:bg-[#f0fffe]" : ""}`}
                    onClick={() => setSigModalOpen(true)} disabled={downloadingPdf}>
                    {downloadingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download PDF
                  </Button>
                ) : FORM_FIELD_CONFIG[form.id] ? (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setModalFormId(form.id)} disabled={downloadingForm === form.id}>
                    {downloadingForm === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download PDF
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" disabled title="Coming soon">
                    <Download className="h-3 w-3" /> Download PDF
                  </Button>
                )
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2" onClick={() => setGuideDialogFormId(form.id)}>
                <Info className="h-3 w-3" /> How to Fill This
              </Button>
            </div>
          </div>
        ))}
      </div>

      {modalFormId && (
        <FormAssistantModal
          formId={modalFormId}
          caseId={caseId}
          onClose={() => setModalFormId(null)}
          onDownload={downloadFormPost}
          onAiGenerate={modalFormId === "mc030" ? generateMC030Declaration : undefined}
        />
      )}

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
                                <div key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5">
                                  <span className="text-xs font-bold text-[#0d6b5e]">{rf.number}</span>
                                  <span className="text-xs text-muted-foreground">{rf.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground/60">Form version referenced: effective {guide.effectiveDate}. Always confirm the current Judicial Council version before filing.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <DialogFooter className="px-6 py-4 border-t">
                  <Button variant="outline" onClick={() => setGuideDialogFormId(null)}>Close</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <SignaturePadModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSign={async (dataUrl) => {
          setSigModalOpen(false); setDownloadingPdf(true);
          try {
            const token = await getToken();
            const res = await fetch(`/api/cases/${caseId}/forms/sc100/signed`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ signatureDataUrl: dataUrl }) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); toast({ title: "Download failed", description: err.error || "Could not generate signed SC-100.", variant: "destructive" }); return; }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `SC100-Signed-Case-${caseId}.pdf`; a.click(); URL.revokeObjectURL(url);
          } catch { toast({ title: "Download failed", description: "Could not generate signed SC-100.", variant: "destructive" }); }
          finally { setDownloadingPdf(false); }
        }}
        onSkipSign={async () => { setSigModalOpen(false); downloadForm("sc100", `SC100-Case-${caseId}.pdf`, setDownloadingPdf); }}
      />
    </div>
  );
}

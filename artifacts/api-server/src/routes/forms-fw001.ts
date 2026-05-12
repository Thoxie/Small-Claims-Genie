import { Router, type IRouter } from "express";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { getOwnedCase } from "../lib/owned-case";
import { CALIFORNIA_COUNTIES } from "./counties";
import {
  loadAsset,
  today,
  resolveDownloadUser,
} from "./forms-common";

const router: IRouter = Router();

// ─── FW-001 Request to Waive Court Fees (AcroForm fill) ──────────────────────

function setField(form: any, name: string, value: string) {
  try {
    const f = form.getTextField(name);
    f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 9 Tf 0 g"));
    f.setText(value || "");
  } catch { /* field not found — skip */ }
}

function checkBox(form: any, name: string, checked: boolean) {
  try {
    if (checked) form.getCheckBox(name).check();
    else form.getCheckBox(name).uncheck();
  } catch { /* skip */ }
}

function hasBenefit(benefitsText: string, keywords: string[]): boolean {
  const lower = benefitsText.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function fmt$(v: any): string {
  if (!v && v !== 0) return "";
  const n = Number(v);
  if (isNaN(n)) return "";
  return n.toFixed(2);
}

router.post("/cases/:id/forms/fw001", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }

  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;

  const signerName = (d.plaintiffIsBusiness && d.secondPlaintiffName)
    ? d.secondPlaintiffName
    : (d.plaintiffName || "");
  const signerTitle = d.plaintiffTitle || "";
  const fullSignerName = signerName + (signerTitle ? `, ${signerTitle}` : "");

  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");

  const county = CALIFORNIA_COUNTIES.find((cc: any) => cc.id === d.countyId);
  const courtInfoLines: string[] = [];
  if (county) {
    courtInfoLines.push(`Superior Court of California, County of ${county.name}`);
    if (county.courthouseName)    courtInfoLines.push(county.courthouseName);
    if (county.courthouseAddress) courtInfoLines.push(county.courthouseAddress);
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null].filter(Boolean).join(", ");
    if (cityZip) courtInfoLines.push(cityZip);
  } else {
    if (d.courthouseName)    courtInfoLines.push(d.courthouseName);
    if (d.courthouseAddress) courtInfoLines.push(d.courthouseAddress);
    if (d.courthouseCity)    courtInfoLines.push([d.courthouseCity, "CA", d.courthouseZip].filter(Boolean).join(" "));
  }
  const courtInfo = courtInfoLines.join("\n");

  const basis        = b.eligibilityBasis || "5a";
  const benefitsText = String(b.benefits || "").toLowerCase();
  const signDate     = b.signDate || today();

  try {
    const acroBytes = loadAsset("forms/fw001_acroform.pdf");
    const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    // ── Page 1 caption ────────────────────────────────────────────────────────
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CourtInfo[0]",  courtInfo);
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "FW-001[0].Page1[0].RightCaption[0].CaseName[0]",   caseName);

    // ── Item 1 — petitioner info ──────────────────────────────────────────────
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerName1[0]",    signerName);
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerStrAddress[0]", d.plaintiffAddress || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerCity[0]",     d.plaintiffCity    || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerState[0]",    d.plaintiffState   || "CA");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerZip[0]",      d.plaintiffZip     || "");
    setField(form, "FW-001[0].Page1[0].List1[0].item1[0].PetitionerTel[0]",      d.plaintiffPhone   || "");

    // ── Item 4 — Superior Court checkbox (always) ─────────────────────────────
    checkBox(form, "FW-001[0].Page1[0].List4[0].item4[0].WaiveSuperiorCrtFee[0]", true);

    // ── Item 5 — eligibility ──────────────────────────────────────────────────
    if (basis === "5a") {
      checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitReceived[0]", true);

      if (hasBenefit(benefitsText, ["food", "calfresh", "snap", "ebt", "calworks", "stamp"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitSNAP[0]",          true);
      if (hasBenefit(benefitsText, ["ssi", "supplemental security income"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitSSI[0]",           true);
      if (hasBenefit(benefitsText, ["ssp", "state supplementary"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitSSP[0]",           true);
      if (hasBenefit(benefitsText, ["medi-cal", "medicaid", "medical"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitMediCal[0]",       true);
      if (hasBenefit(benefitsText, ["county relief", "general assist", "ga ", "gr "]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitCtyGA[0]",         true);
      if (hasBenefit(benefitsText, ["ihss", "in-home"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitIHHS[0]",          true);
      if (hasBenefit(benefitsText, ["calworks", "tanf", "welfare", "tribal"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitCalWORKSTANF[0]",  true);
      if (hasBenefit(benefitsText, ["capi"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitCAPI11[0]",        true);
      if (hasBenefit(benefitsText, ["wic"]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitCAPI12[0]",        true);
      if (hasBenefit(benefitsText, ["unemployment", "edd", "ui "]))
        checkBox(form, "FW-001[0].Page1[0].List5[0].Lia[0].PublicBenefitCAPI13[0]",        true);
    }

    if (basis === "5b") {
      checkBox(form, "FW-001[0].Page1[0].List5[0].Lib[0].GrossMonthIncomeLess[0]", true);
    }

    if (basis === "5c") {
      checkBox(form, "FW-001[0].Page1[0].List5[0].Lic[0].IncomeInsufficientRequest[0]", true);
      // Default: waive all court fees (first checkbox)
      checkBox(form, "FW-001[0].Page1[0].List5[0].Lic[0].FeeRequestDef[0]", true);
    }

    // ── Signature area ────────────────────────────────────────────────────────
    setField(form, "FW-001[0].Page1[0].Sign[0].SigDate[0]",      signDate);
    setField(form, "FW-001[0].Page1[0].Sign[0].PetitionerName[0]", fullSignerName);

    // ── Page 2 — income & expense detail (5b or 5c) ───────────────────────────
    if (basis === "5b" || basis === "5c") {
      setField(form, "FW-001[0].Page2[0].pXCaption[0].PetitionerName1[0]", signerName);
      setField(form, "FW-001[0].Page2[0].pXCaption[0].CaseNumber[0]",      d.caseNumber || "");

      if (b.grossMonthlyIncome) {
        setField(form, "FW-001[0].Page2[0].List8[0].Lia[0].IncomeSource1[0]",  "Employment / other income");
        setField(form, "FW-001[0].Page2[0].List8[0].Lia[0].IncomeAmount1[0]",  fmt$(b.grossMonthlyIncome));
        setField(form, "FW-001[0].Page2[0].List8[0].Lib[0].TotalIncome[0]",    fmt$(b.grossMonthlyIncome));
      }

      if (basis === "5c") {
        if (b.monthlyRent)           setField(form, "FW-001[0].Page2[0].List11[0].Lib[0].ExpenseHousing[0]",          fmt$(b.monthlyRent));
        if (b.monthlyFood)           setField(form, "FW-001[0].Page2[0].List11[0].Lic[0].ExpenseFoodSupplies[0]",     fmt$(b.monthlyFood));
        if (b.monthlyUtilities)      setField(form, "FW-001[0].Page2[0].List11[0].Lid[0].ExpenseUtilitiesPhone[0]",   fmt$(b.monthlyUtilities));
        if (b.monthlyTransportation) setField(form, "FW-001[0].Page2[0].List11[0].Lik[0].ExpenseTransportation[0]",   fmt$(b.monthlyTransportation));
        if (b.monthlyMedical)        setField(form, "FW-001[0].Page2[0].List11[0].Lig[0].ExpenseMedicalDental[0]",   fmt$(b.monthlyMedical));

        const numFields = [b.monthlyRent, b.monthlyFood, b.monthlyUtilities, b.monthlyTransportation, b.monthlyMedical];
        const totalExp = numFields.reduce((sum: number, f: any) => sum + (f ? Number(f) : 0), 0);
        if (totalExp > 0) setField(form, "FW-001[0].Page2[0].List11[0].Total[0].Totalmonthlyexpenses[0]", fmt$(totalExp));
      }
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="FW001-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "FW-001 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate FW-001 PDF." });
  }
});

export default router;

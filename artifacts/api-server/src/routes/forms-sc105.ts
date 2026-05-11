import { Router, type IRouter } from "express";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { getOwnedCase, getUserId } from "../lib/owned-case";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CALIFORNIA_COUNTIES } from "./counties";
import {
  loadAsset, today,
  formatDateDisplay,
  resolveDownloadUser,
} from "./forms-common";

const router: IRouter = Router();

// ─── SC-105 AI Draft ──────────────────────────────────────────────────────────
router.post("/cases/:id/forms/sc105/ai-draft", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;

  const plaintiffName  = String(d.plaintiffName  || "Plaintiff");
  const defendantName  = String(d.defendantName  || "Defendant");
  const claimAmount    = d.claimAmount ? `$${Number(d.claimAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "an amount to be determined";
  const claimDesc      = String(d.claimDescription || "");
  const incidentDate   = d.incidentDate ? formatDateDisplay(d.incidentDate) : "";
  const hearingDate    = d.hearingDate  ? formatDateDisplay(d.hearingDate)  : "";

  const prompt = [
    `You are a California small claims court expert helping a self-represented litigant complete SC-105 (Request for Court Order and Answer).`,
    ``,
    `Case context:`,
    `- Plaintiff: ${plaintiffName}`,
    `- Defendant: ${defendantName}`,
    `- Claim amount: ${claimAmount}`,
    incidentDate ? `- Date of incident: ${incidentDate}` : "",
    hearingDate  ? `- Hearing date: ${hearingDate}`      : "",
    claimDesc    ? `- Case description: ${claimDesc}`    : "",
    ``,
    `Return a JSON object with exactly two fields:`,
    `1. "orderRequested": A single concise sentence (max 200 characters) stating the specific court order being requested. Use plain legal English. Start with an action verb (e.g. "Continue…", "Order…", "Allow…"). No markdown.`,
    `2. "orderReason": Two to four sentences (max 500 characters total) explaining the factual basis for the request. Reference the case facts. Plain text only, no markdown, no bullet points.`,
    ``,
    `Respond with only the JSON object.`,
  ].filter(Boolean).join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { orderRequested?: string; orderReason?: string };
    res.json({
      orderRequested: (parsed.orderRequested || "").trim().replace(/^["']|["']$/g, ""),
      orderReason:    (parsed.orderReason    || "").trim().replace(/^["']|["']$/g, ""),
    });
  } catch (err: any) {
    req.log.error({ err }, "SC-105 AI draft error");
    res.status(500).json({ error: "AI draft failed — please try again." });
  }
});

// ─── SC-105 Request for Court Order and Answer (AcroForm fill) ───────────────
router.post("/cases/:id/forms/sc105", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid case ID" }); return; }
  const userId = await resolveDownloadUser(req, res, id);
  if (!userId) return;
  const c = await getOwnedCase(id, userId);
  if (!c) { res.status(404).json({ error: "Case not found" }); return; }
  const d = c as unknown as Record<string, any>;
  const b = req.body as Record<string, any>;
  const caseName = [d.plaintiffName, d.defendantName].filter(Boolean).join(" v. ");
  const county = CALIFORNIA_COUNTIES.find((cc) => cc.id === d.countyId);
  const courtInfoLines: string[] = [];
  if (county) {
    courtInfoLines.push(county.name);
    if (county.courthouseName) courtInfoLines.push(county.courthouseName);
    if (county.courthouseAddress) courtInfoLines.push(county.courthouseAddress);
    const cityZip = [county.courthouseCity, county.courthouseZip ? `CA ${county.courthouseZip}` : null].filter(Boolean).join(", ");
    if (cityZip) courtInfoLines.push(cityZip);
    if (county.phone) courtInfoLines.push(county.phone);
  } else {
    if (d.courthouseName) courtInfoLines.push(d.courthouseName);
    if (d.courthouseAddress) courtInfoLines.push(d.courthouseAddress);
  }
  const courtInfo = courtInfoLines.join("\n") || b.courtStreet || "";
  const parties: any[] = b.noticeParties || [];

  function setField(form: any, name: string, value: string) {
    try {
      const f = form.getTextField(name);
      f.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 11 Tf 0 g"));
      f.setText(value || "");
    } catch { /* field may not exist */ }
  }
  function checkBox(form: any, name: string, checked: boolean) {
    try { if (checked) form.getCheckBox(name).check(); else form.getCheckBox(name).uncheck(); } catch { /* field may not exist */ }
  }

  try {
    const acroBytes = loadAsset("forms/sc105_acroform.pdf");
    const pdfDoc = await PDFDocument.load(acroBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    setField(form, "SC-105[0].Page1[0].RightCaption[0].CourtInfo[0]", courtInfo);
    setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "SC-105[0].Page1[0].RightCaption[0].CaseName[0]", caseName);

    setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName3[0]", b.requestingPartyName || "");
    setField(form, "SC-105[0].Page1[0].List1[0].Item[0].FullName2[0]", b.requestingPartyAddress || "");
    checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[0]", b.requestingPartyRole === "defendant");
    checkBox(form, "SC-105[0].Page1[0].List1[0].Item[0].Level5[1]", b.requestingPartyRole === "plaintiff");

    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make1_ft[0]", parties[0]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model1_ft[0]", parties[0]?.address || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make2_ft[0]", parties[1]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model2_ft[0]", parties[1]?.address || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Make3_ft[0]", parties[2]?.name || "");
    setField(form, "SC-105[0].Page1[0].List2[0].Item1[0].Model3_ft[0]", parties[2]?.address || "");

    setField(form, "SC-105[0].Page1[0].List3[0].item3[0].Specify[0].Disagree_ft1[0]", b.orderRequested || "");
    setField(form, "SC-105[0].Page1[0].List4[0].item4[0].Explain[0].Disagree_ft6[0]", b.orderReason || "");

    setField(form, "SC-105[0].Page1[0].Sign[0].SigDate4[0]", b.signDate || today());
    setField(form, "SC-105[0].Page1[0].Sign[0].SigName[0]", b.requestingPartyName || "");

    setField(form, "SC-105[0].Page2[0].RightCaption[0].CourtInfo[0]", courtInfo);
    setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseNumber[0]", d.caseNumber || "");
    setField(form, "SC-105[0].Page2[0].RightCaption[0].CaseName[0]", caseName);

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SC105-Case-${id}.pdf"`);
    res.setHeader("Content-Length", pdfBytes.length);
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    req.log.error({ err }, "SC-105 PDF error");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate SC-105 PDF." });
  }
});

export default router;

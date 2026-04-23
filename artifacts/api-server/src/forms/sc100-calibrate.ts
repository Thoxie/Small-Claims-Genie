import * as fs from "fs";
import * as path from "path";
import { openai } from "@workspace/integrations-openai-ai-server";

// ── Constants ─────────────────────────────────────────────────────────────────
// PNG backgrounds are 2550×3300 px (300 dpi). PDF page is 612×792 pt (72 dpi).
// Both axes share the same scale: pt = px × 0.24
const IMG_W = 2550;
const IMG_H = 3300;
const PAGE_W = 612;
const PAGE_H = 792;
const SCALE = PAGE_W / IMG_W; // 0.24 exactly (612/2550 = 792/3300)

// ── Types ─────────────────────────────────────────────────────────────────────
export type FieldCoord = {
  x: number;        // CSS left in pt (from left edge of page)
  y: number;        // CSS top in pt (from top edge of page, y=0 is top)
  size?: number;    // font-size in pt, optional — defaults applied per field
};

export type SC100FieldMap = {
  version: string;
  generated: string;
  imageSize: { w: number; h: number };
  pageSize: { w: number; h: number };
  pages: Record<string, Record<string, FieldCoord>>;
};

// ── Field specs per page ──────────────────────────────────────────────────────
// Each entry tells GPT-4o what field to find and how to interpret its position.
// "px_x" and "px_y" in GPT-4o response = pixel coords in the 2550×3300 image.
// Converted to pt by multiplying by SCALE (0.24).
//
// Position convention:
//   text fields  → top-left corner of where the typed text begins
//   checkboxes   → top-left corner of the checkbox square

type FieldSpec = {
  id: string;
  description: string;
  type: "text" | "checkbox";
  size?: number;
};

const PAGE_SPECS: Record<number, FieldSpec[]> = {
  1: [
    {
      id: "countyDisplay",
      type: "text",
      size: 11,
      description:
        "Top-right area: the blank space that comes AFTER the printed text 'Superior Court of California, County of' — this is where the county name is typed. Return the left edge of that blank space, vertically on the same line as the printed text.",
    },
    {
      id: "courthouseName",
      type: "text",
      size: 8,
      description:
        "Inside the rectangular court info box in the upper-right: the FIRST blank line where the courthouse name and division would be written (small 8-pt text).",
    },
    {
      id: "courthouseAddress",
      type: "text",
      size: 8,
      description:
        "Inside the court info box: the SECOND blank line where the courthouse street address is written.",
    },
    {
      id: "courthouseLocation",
      type: "text",
      size: 8,
      description:
        "Inside the court info box: the THIRD blank line where 'City CA ZIP' is written.",
    },
    {
      id: "caseNameDisplay",
      type: "text",
      size: 8,
      description:
        "The 'Case Name:' label area — the blank space to the right of the 'Case Name:' label where 'Plaintiff v. Defendant' is written.",
    },
  ],

  2: [
    {
      id: "plaintiffNameHeader",
      type: "text",
      size: 9,
      description:
        "In the narrow shaded header bar at the very top of page 2: the blank area after 'Plaintiff (list names):' where the plaintiff's name is typed.",
    },
    {
      id: "caseNumberHeader",
      type: "text",
      size: 9,
      description:
        "In the narrow shaded header bar at the very top of page 2: the blank area after 'Case Number:' on the RIGHT side of the header.",
    },
    {
      id: "plaintiffName",
      type: "text",
      size: 11,
      description:
        "Section 1 (plaintiff section), FIRST 'Name:' label: the blank line immediately to the right of the very first 'Name:' label in section 1. This is the primary plaintiff's full name.",
    },
    {
      id: "plaintiffPhone",
      type: "text",
      size: 11,
      description:
        "Section 1, FIRST row: the blank line to the right of the 'Phone:' label on the same line as the primary plaintiff's Name field.",
    },
    {
      id: "plaintiffStreet",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff address row: the blank space after the 'Street address:' label (or just 'Street') on the line below the plaintiff's Name/Phone row.",
    },
    {
      id: "plaintiffCity",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff address row: the blank space after the 'City:' label on the same line as the street address.",
    },
    {
      id: "plaintiffState",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff address row: the blank space after the 'State:' label (usually CA pre-filled or blank).",
    },
    {
      id: "plaintiffZip",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff address row: the blank space after the 'Zip:' label.",
    },
    {
      id: "plaintiffMailingStreet",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff MAILING address row: the blank space after 'Mailing address (if different):' or similar mailing street label. This is a separate row below the physical address row.",
    },
    {
      id: "plaintiffMailingCity",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff mailing address row: the City blank.",
    },
    {
      id: "plaintiffMailingState",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff mailing address row: the State blank.",
    },
    {
      id: "plaintiffMailingZip",
      type: "text",
      size: 11,
      description:
        "Section 1, plaintiff mailing address row: the Zip blank.",
    },
    {
      id: "plaintiffEmail",
      type: "text",
      size: 11,
      description:
        "Section 1: the blank line after 'Email address (if available):' label.",
    },
    {
      id: "p2Name",
      type: "text",
      size: 11,
      description:
        "Section 1, the SECOND plaintiff sub-section: the blank line after the second 'Name:' label (below the email row of the first plaintiff).",
    },
    {
      id: "p2Phone",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff row: the blank after 'Phone:' on the same line as the second plaintiff Name.",
    },
    {
      id: "p2Street",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff address: the Street blank.",
    },
    {
      id: "p2City",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff address: the City blank.",
    },
    {
      id: "p2State",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff address: the State blank.",
    },
    {
      id: "p2Zip",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff address: the Zip blank.",
    },
    {
      id: "p2MailingStreet",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff mailing address: the Street blank.",
    },
    {
      id: "p2MailingCity",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff mailing address: the City blank.",
    },
    {
      id: "p2MailingState",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff mailing address: the State blank.",
    },
    {
      id: "p2MailingZip",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff mailing address: the Zip blank.",
    },
    {
      id: "p2Email",
      type: "text",
      size: 11,
      description:
        "Section 1, second plaintiff: the email blank.",
    },
    {
      id: "defendantName",
      type: "text",
      size: 11,
      description:
        "Section 2 (defendant section): the blank after the 'Name:' label in section 2. This is the defendant's full name or business name.",
    },
    {
      id: "defendantPhone",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant row: the blank after 'Phone:' on the same line as the defendant Name.",
    },
    {
      id: "defendantStreet",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant address: the Street blank.",
    },
    {
      id: "defendantCity",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant address: the City blank.",
    },
    {
      id: "defendantState",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant address: the State blank.",
    },
    {
      id: "defendantZip",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant address: the Zip blank.",
    },
    {
      id: "defendantMailingStreet",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant mailing address: the Street blank (on the mailing address row below physical address).",
    },
    {
      id: "defendantMailingCity",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant mailing address: the City blank.",
    },
    {
      id: "defendantMailingState",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant mailing address: the State blank.",
    },
    {
      id: "defendantMailingZip",
      type: "text",
      size: 11,
      description:
        "Section 2, defendant mailing address: the Zip blank.",
    },
    {
      id: "agentName",
      type: "text",
      size: 11,
      description:
        "Section 2, agent sub-section: the 'Name:' blank for the registered agent or person authorized for service (near bottom of section 2, after wording about corporations/partnerships/LLCs).",
    },
    {
      id: "agentTitle",
      type: "text",
      size: 11,
      description:
        "Section 2, agent row: the blank after 'Job title, if known:' or 'Title:' on the same line as the agent Name.",
    },
    {
      id: "agentStreet",
      type: "text",
      size: 11,
      description:
        "Section 2, agent address: the Street blank.",
    },
    {
      id: "agentCity",
      type: "text",
      size: 11,
      description:
        "Section 2, agent address: the City blank.",
    },
    {
      id: "agentState",
      type: "text",
      size: 11,
      description:
        "Section 2, agent address: the State blank.",
    },
    {
      id: "agentZip",
      type: "text",
      size: 11,
      description:
        "Section 2, agent address: the Zip blank.",
    },
    {
      id: "claimAmount",
      type: "text",
      size: 11,
      description:
        "Section 3: the blank space where the dollar amount of the claim is written (to the right of a '$' symbol).",
    },
    {
      id: "claimDescription",
      type: "text",
      size: 10,
      description:
        "Section 3a: the beginning of the multi-line text area where the reason the defendant owes money is written. Return the top-left of this text area.",
    },
  ],

  3: [
    {
      id: "p3PlaintiffHeader",
      type: "text",
      size: 9,
      description:
        "The shaded header bar at the top of page 3: blank after 'Plaintiff (list names):'.",
    },
    {
      id: "p3CaseNumberHeader",
      type: "text",
      size: 9,
      description:
        "The shaded header bar at the top of page 3: blank after 'Case Number:' on the right side.",
    },
    {
      id: "incidentDate",
      type: "text",
      size: 11,
      description:
        "Section 3b: the blank space after 'When did this happen? (Date):' where a single date is written.",
    },
    {
      id: "dateStarted",
      type: "text",
      size: 11,
      description:
        "Section 3b: the blank after 'Date started:' on the date-range row (for incidents spanning a period).",
    },
    {
      id: "dateThrough",
      type: "text",
      size: 11,
      description:
        "Section 3b: the blank after 'through:' on the date-range row.",
    },
    {
      id: "howAmountCalculated",
      type: "text",
      size: 10,
      description:
        "Section 3c: the beginning of the multi-line area where the calculation of damages is explained.",
    },
    {
      id: "needsMC031",
      type: "checkbox",
      description:
        "The checkbox (small square) next to the text about needing additional space or attaching an MC-030/MC-031 form. Usually near the bottom of the section 3c area.",
    },
    {
      id: "priorDemandYes",
      type: "checkbox",
      description:
        "Section 4: the 'Yes' checkbox square on the row asking whether plaintiff asked defendant to pay before filing.",
    },
    {
      id: "priorDemandNo",
      type: "checkbox",
      description:
        "Section 4: the 'No' checkbox square on the same row as the Yes checkbox in section 4.",
    },
    {
      id: "priorDemandWhyNot",
      type: "text",
      size: 10,
      description:
        "Section 4: the text area beginning after 'If no, explain why not:' where the reason for no prior demand is written.",
    },
    {
      id: "venueA",
      type: "checkbox",
      description:
        "Section 5, venue option (a): the checkbox square next to option (a) — the first venue option (usually about where defendant lives/has office).",
    },
    {
      id: "venueB",
      type: "checkbox",
      description:
        "Section 5, venue option (b): the checkbox square next to option (b).",
    },
    {
      id: "venueC",
      type: "checkbox",
      description:
        "Section 5, venue option (c): the checkbox square next to option (c).",
    },
    {
      id: "venueD",
      type: "checkbox",
      description:
        "Section 5, venue option (d): the checkbox square next to option (d).",
    },
    {
      id: "venueE",
      type: "checkbox",
      description:
        "Section 5, venue option (e) or 'Other': the checkbox square next to the last/other venue option.",
    },
    {
      id: "venueOtherText",
      type: "text",
      size: 10,
      description:
        "Section 5, venue option (e)/(Other): the blank text field to the right of the 'Other (specify):' label where the reason is typed.",
    },
    {
      id: "venueZip",
      type: "text",
      size: 11,
      description:
        "Section 6: the blank where a zip code is entered (usually asking where the transaction took place).",
    },
    {
      id: "attyFeeYes",
      type: "checkbox",
      description:
        "Section 7: the 'Yes' checkbox on the row asking if this claim is an attorney fee dispute.",
    },
    {
      id: "attyFeeNo",
      type: "checkbox",
      description:
        "Section 7: the 'No' checkbox on the same row as the attyFeeYes checkbox.",
    },
    {
      id: "attyArbitration",
      type: "checkbox",
      description:
        "Section 7: the checkbox about whether arbitration has already occurred (usually a separate line below the Yes/No fee dispute row).",
    },
    {
      id: "publicEntityYes",
      type: "checkbox",
      description:
        "Section 8: the 'Yes' checkbox on the row asking if plaintiff is suing a public entity (government agency).",
    },
    {
      id: "publicEntityNo",
      type: "checkbox",
      description:
        "Section 8: the 'No' checkbox on the same row as publicEntityYes.",
    },
    {
      id: "publicEntityDate",
      type: "text",
      size: 11,
      description:
        "Section 8: the blank after 'A claim was filed on (date):' where the government claim filing date is written.",
    },
  ],

  4: [
    {
      id: "p4PlaintiffHeader",
      type: "text",
      size: 9,
      description:
        "The shaded header bar at the top of page 4: blank after 'Plaintiff (list names):'.",
    },
    {
      id: "p4CaseNumberHeader",
      type: "text",
      size: 9,
      description:
        "The shaded header bar at the top of page 4: blank after 'Case Number:' on the right side.",
    },
    {
      id: "filed12Yes",
      type: "checkbox",
      description:
        "Section 9: the 'Yes' checkbox on the row asking if plaintiff has filed more than 12 small claims in the past 12 months.",
    },
    {
      id: "filed12No",
      type: "checkbox",
      description:
        "Section 9: the 'No' checkbox on the same row as filed12Yes.",
    },
    {
      id: "over2500Yes",
      type: "checkbox",
      description:
        "Section 10: the 'Yes' checkbox on the row asking if the claim exceeds $2,500 and plaintiff is a business.",
    },
    {
      id: "over2500No",
      type: "checkbox",
      description:
        "Section 10: the 'No' checkbox on the same row as over2500Yes.",
    },
    {
      id: "declarationDate",
      type: "text",
      size: 11,
      description:
        "Section 11 (declaration): the blank after 'Date:' where today's date is written before the signature.",
    },
    {
      id: "declarantName",
      type: "text",
      size: 11,
      description:
        "Section 11 (declaration): the blank labeled 'Plaintiff types or prints name here' below the signature line.",
    },
  ],
};

// ── GPT-4o calibration for a single page ─────────────────────────────────────
async function calibratePage(
  pageNum: number,
  pngPath: string
): Promise<Record<string, FieldCoord>> {
  const specs = PAGE_SPECS[pageNum];
  if (!specs || specs.length === 0) return {};

  const imageBase64 = fs.readFileSync(pngPath).toString("base64");

  const fieldList = specs
    .map((s) => `- "${s.id}" (${s.type}): ${s.description}`)
    .join("\n");

  const prompt = `You are analyzing page ${pageNum} of a California SC-100 small claims court form.

The image you see is ${IMG_W} × ${IMG_H} pixels and represents a ${PAGE_W} × ${PAGE_H} point PDF page.

For each field listed below, return the PIXEL coordinate (in the ${IMG_W}×${IMG_H} image) where content should be placed:
- For TEXT fields: the TOP-LEFT corner of where the typed text begins (on or just above the printed underline).
- For CHECKBOX fields: the TOP-LEFT corner of the checkbox square (so an "X" placed there appears inside the box).

Return ONLY a valid JSON object. Keys are field IDs, values are {"px_x": number, "px_y": number}.
Do not include any explanation or markdown — just the raw JSON object.

Fields to locate:
${fieldList}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
    max_completion_tokens: 2000,
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as Record<
    string,
    { px_x: number; px_y: number }
  >;

  // Convert pixel coords → CSS pt coords (multiply by 0.24)
  const result: Record<string, FieldCoord> = {};
  for (const spec of specs) {
    const coords = parsed[spec.id];
    if (coords && typeof coords.px_x === "number" && typeof coords.px_y === "number") {
      result[spec.id] = {
        x: Math.round(coords.px_x * SCALE * 10) / 10,
        y: Math.round(coords.px_y * SCALE * 10) / 10,
        size: spec.size,
      };
    } else {
      console.warn(`[sc100-calibrate] Page ${pageNum}: GPT-4o did not return coords for "${spec.id}"`);
    }
  }

  return result;
}

// ── Verification pass: compare filled form vs blank, correct offsets ──────────
// filledPngPaths: array of 4 PNG paths (one per page) of a generated filled PDF
// Returns an updated field map with corrections applied
export async function verifySC100(
  assetDir: string,
  filledPngPaths: string[]
): Promise<SC100FieldMap> {
  const mapPath = path.join(assetDir, "forms", "sc100-field-map.json");
  if (!fs.existsSync(mapPath)) {
    throw new Error("No field map found — run calibration first.");
  }

  const fieldMap: SC100FieldMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  console.log("[sc100-verify] Starting verification pass...");

  await Promise.all(
    [1, 2, 3, 4].map(async (pageNum) => {
      const blankPngPath = path.join(assetDir, `sc100_hq-${pageNum}.png`);
      const filledPngPath = filledPngPaths[pageNum - 1];
      if (!fs.existsSync(blankPngPath) || !fs.existsSync(filledPngPath)) {
        console.warn(`[sc100-verify] Skipping page ${pageNum} — PNG missing`);
        return;
      }

      const pageKey = String(pageNum);
      const currentCoords = fieldMap.pages[pageKey] ?? {};
      if (Object.keys(currentCoords).length === 0) return;

      const blankB64  = fs.readFileSync(blankPngPath).toString("base64");
      const filledB64 = fs.readFileSync(filledPngPath).toString("base64");

      // Build a readable list of current field positions for GPT-4o
      const fieldList = Object.entries(currentCoords)
        .map(([id, c]) => `"${id}": currently at x=${c.x}pt, y=${c.y}pt`)
        .join("\n");

      const prompt = `You are verifying field alignment on page ${pageNum} of a California SC-100 small claims court form.

You have two images:
- IMAGE 1 (first image): The BLANK form background — showing printed labels, underlines, and boxes.
- IMAGE 2 (second image): The FILLED form — the same form with typed text placed on it.

The page is ${PAGE_W} points wide × ${PAGE_H} points tall.

Your job: for each field below, look at IMAGE 2 and evaluate whether the typed text is correctly positioned ON the printed underline or inside the correct box. 

If text appears ABOVE the line → positive dy needed (move text down).
If text appears BELOW the line → negative dy needed (move text up).
If text starts too far LEFT → positive dx needed (move right).
If text starts too far RIGHT → negative dx needed (move left).
If text is correctly positioned → dx: 0, dy: 0.

Return ONLY a valid JSON object. Keys are field IDs, values are {"dx": number, "dy": number} corrections in pt.
Only include fields that need correction (skip correctly placed fields or set dx:0, dy:0).

Current field positions:
${fieldList}`;

      console.log(`[sc100-verify] Verifying page ${pageNum} (${Object.keys(currentCoords).length} fields)...`);

      const response = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${blankB64}`, detail: "high" },
              },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${filledB64}`, detail: "high" },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const corrections = JSON.parse(raw) as Record<string, { dx: number; dy: number }>;

      let corrected = 0;
      for (const [fieldId, delta] of Object.entries(corrections)) {
        if (!fieldMap.pages[pageKey][fieldId]) continue;
        if (delta.dx === 0 && delta.dy === 0) continue;
        fieldMap.pages[pageKey][fieldId].x = Math.round((fieldMap.pages[pageKey][fieldId].x + delta.dx) * 10) / 10;
        fieldMap.pages[pageKey][fieldId].y = Math.round((fieldMap.pages[pageKey][fieldId].y + delta.dy) * 10) / 10;
        corrected++;
      }
      console.log(`[sc100-verify] Page ${pageNum} done — ${corrected} fields corrected.`);
    })
  );

  fieldMap.generated = new Date().toISOString();
  const outputPath = path.join(assetDir, "forms", "sc100-field-map.json");
  fs.writeFileSync(outputPath, JSON.stringify(fieldMap, null, 2));
  console.log(`[sc100-verify] Verified field map saved to ${outputPath}`);
  return fieldMap;
}

// ── Main export: calibrate all 4 pages and save to JSON ──────────────────────
export async function calibrateSC100(assetDir: string): Promise<SC100FieldMap> {
  console.log("[sc100-calibrate] Starting calibration of all 4 pages...");

  const pages: Record<string, Record<string, FieldCoord>> = {};

  // Process pages in parallel for speed
  await Promise.all(
    [1, 2, 3, 4].map(async (pageNum) => {
      const pngPath = path.join(assetDir, `sc100_hq-${pageNum}.png`);
      if (!fs.existsSync(pngPath)) {
        console.error(`[sc100-calibrate] PNG not found: ${pngPath}`);
        return;
      }
      console.log(`[sc100-calibrate] Processing page ${pageNum}...`);
      const coords = await calibratePage(pageNum, pngPath);
      pages[String(pageNum)] = coords;
      console.log(
        `[sc100-calibrate] Page ${pageNum} done — ${Object.keys(coords).length} fields located.`
      );
    })
  );

  const fieldMap: SC100FieldMap = {
    version: "2.0",
    generated: new Date().toISOString(),
    imageSize: { w: IMG_W, h: IMG_H },
    pageSize: { w: PAGE_W, h: PAGE_H },
    pages,
  };

  const outputPath = path.join(assetDir, "forms", "sc100-field-map.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(fieldMap, null, 2));
  console.log(`[sc100-calibrate] Field map saved to ${outputPath}`);

  return fieldMap;
}

import * as fs from "fs";
import * as path from "path";
import { PDFDocument } from "pdf-lib";

const ASSETS = path.join(process.cwd(), "assets");

async function mapFields(pdfPath: string, outPath: string, label: string) {
  const bytes = fs.readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();
  console.log(`\n=== ${label} — ${fields.length} fields ===`);
  for (const f of fields) {
    const name = f.getName();
    const typeName = f.constructor.name;
    if (typeName.includes("TextField")) {
      try {
        const tf = form.getTextField(name);
        const widgets = (tf as any).acroField.Widgets();
        if (widgets.length > 0) {
          const rect = widgets[0].Rect()?.asRectangle();
          console.log(`  TextField "${name}" page=${doc.getPageIndices()[0]} rect=x${rect?.x?.toFixed(0)},y${rect?.y?.toFixed(0)},w${rect?.width?.toFixed(0)},h${rect?.height?.toFixed(0)}`);
        }
        tf.setText(`[${name.slice(0,12)}]`);
      } catch(e: any) { console.log(`  TextField "${name}" ERROR: ${e.message}`); }
    }
  }
  try {
    const saved = await doc.save({ updateFieldAppearances: true });
    fs.writeFileSync(outPath, saved);
    console.log(`  → saved ${outPath}`);
  } catch(e: any) {
    const saved = await doc.save({ updateFieldAppearances: false });
    fs.writeFileSync(outPath, saved);
    console.log(`  → saved (fallback) ${outPath}`);
  }
}

async function main() {
  await mapFields(`${ASSETS}/fl-forms/clkct333-miami-dade.pdf`, "/tmp/form-check/clkct333-field-map.pdf", "CLK/CT 333");
  await mapFields(`${ASSETS}/fl-forms/plain-statement-of-claim-orange.pdf`, "/tmp/form-check/orange-field-map.pdf", "Orange Plain SOC");
  await mapFields(`${ASSETS}/fl-forms/statement-of-claim-hillsborough.pdf`, "/tmp/form-check/hillsborough-field-map.pdf", "Hillsborough SOC");
}
main().catch(e => { console.error(e); process.exit(1); });

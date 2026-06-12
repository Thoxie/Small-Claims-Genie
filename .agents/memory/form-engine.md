---
name: Form engine architecture
description: How the unified court-form engine works — FormRegistry, FormDefinition interface, rendering approaches, and which forms use which approach.
---

# Unified Form Engine Architecture

## Overview
All 11 court forms are registered in `FormRegistry` (singleton in `forms/registry.ts`). Each form implements `FormDefinition` with a `generate(data, body, opts?)` method. Routes are consolidated in `routes/forms-unified.ts`, which dispatches through `forms/generic-handler.ts#makeFormHandler`.

## Key files
- `forms/registry.ts` — FormDefinition interface + FormRegistry singleton
- `forms/generic-handler.ts` — makeFormHandler() factory, handles auth/ownership/streaming
- `forms/definitions/index.ts` — barrel that imports all 11 definitions (side-effect registers them)
- `forms/enrichment.ts` — shared utilities: today(), formatDate(), formatTime(), buildCourtInfo(), buildCourtInfoFormal()
- `forms/pdftk-fdf.ts` — pdftk_fill_form() and generateFdf() for XFA forms
- `routes/forms-unified.ts` — single route file for all form endpoints
- `routes/forms-mc030.ts` — KEPT: complex overlay assembly, still used by unified route

## Rendering approach decision tree
1. `pdf-lib` shows > 0 fields → **pdf-lib fill** (standard AcroForm): SC-104, SC-105, SC-112A, FW-001
2. `pdf-lib` shows 0 fields but `pdftk dump_data_fields` shows fields → **pdftk FDF fill** (XFA): SC-103, SC-120, SC-150
3. Neither shows fields → **PNG overlay** (pdf-lib drawing): SC-100A, SC-140, MC-030

## Why pdf-lib can't fill XFA forms
XFA (XML Forms Architecture) forms like SC-103/SC-120/SC-150 use a different internal structure. pdf-lib's `getForm().getFields()` returns 0 fields for these. pdftk can fill them via the FDF protocol. The official CA Judicial Council PDFs at courts.ca.gov use XFA.

**Why this matters:** Always test a new Judicial Council PDF with both pdf-lib and pdftk before picking an approach. Never assume all official PDFs use standard AcroForm.

## Adding a new form
1. Create `forms/definitions/<id>-definition.ts` implementing FormDefinition
2. Call `FormRegistry.register(def)` at module load time
3. Add `export * from "./<id>-definition"` to `forms/definitions/index.ts`
4. Add `router.post(...)` + `makeFormHandler(...)` to `routes/forms-unified.ts`

See `ADDING_A_FORM.md` in the workspace root for full guide.

## MC-030 routing — all 3 variants dispatched through mc030Definition.generate()
MC-030 has 3 variants (basic, signed, with-exhibits). All 3 routes use `makeFormHandler("MC-030", ...)`. The definition's `generate()` inspects body/opts to pick the right variant:
- opts.signatureBytes present → signed variant (generateMC030SignedPdf)
- body.exhibitDocIds non-empty, no sig → with-exhibits variant (generateMC030WithExhibitsPdf)
- otherwise → basic (generateMC030BasicPdf)

## SC-100 routing
SC-100 enrichment (deterministic + AI) runs inside `sc100Definition.generate()`. All three variants (GET basic, POST signed, POST with-overrides) use `makeFormHandler`. The with-overrides variant uses `{ downloadParam: "download" }` so callers can pass `?download=1` for attachment vs omit for inline preview.

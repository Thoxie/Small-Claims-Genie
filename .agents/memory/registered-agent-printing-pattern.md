---
name: Registered agent (business defendant) printing pattern
description: Two valid patterns for printing defendantAgentName/Street/City/State/Zip on state court forms depending on form layout constraints.
---

Intake collects `defendantIsBusinessOrEntity` + `defendantAgentName`/`defendantAgentTitle`/`defendantAgentStreet/City/State/Zip` for business defendants, but form definitions do not automatically print them — each form definition must explicitly wire these fields in, and it's easy for a new form/county PDF to silently omit this.

Two established patterns, pick based on available space on the target PDF:

1. **Additive block** (TX, NC, VA) — when the defendant column/section has blank vertical space, add a "Registered Agent:" + "Agent Address:" block after the phone/email rows, keeping the original defendant name/address fields unchanged. Used for pure programmatic pdf-lib forms with layout control.

2. **Substitution** (NJ, and all 4 FL county AcroForm templates: Volusia, Miami-Dade, Orange, Hillsborough) — when the form is a fixed AcroForm template with only one defendant-name/address field pair and no spare space, substitute `"{defendantName} (c/o {agentName})"` into the name field and swap the agent's address into the address field(s), replacing the original defendant address entirely.

**Why:** Fixed-template AcroForm PDFs (official county/state forms) have no room to add new lines; programmatic pdf-lib forms do. Guessing wrong (e.g. trying to add a block to a fixed template) causes overflow/clipping.

**How to apply:** When adding agent-field support to a new state/county form, first check if it's a pure pdf-lib layout (additive) or an AcroForm/XFA template fill (substitution — check with `pdftk dump_data_fields` for a single vs. no dedicated agent field). Verify with an end-to-end test using a business-defendant case + `pdftotext`, since existing test fixtures typically use non-business defendants and won't catch a missing agent-printing gap.

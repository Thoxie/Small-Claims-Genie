---
name: AZ complaint Pinal-branded asset
description: The LJSC00001F PDF asset is Pinal County's copy; dropdown + header + seal need per-county overrides
---
The AZ complaint asset (az-ljsc00001f-complaint.pdf) is Pinal County's copy of the statewide LJSC00001F form. Three Pinal-specific things must be handled per case:
1. `Dropdown1` court field lists only Pinal precincts — bypass by `setOptions([courtLine]); select(courtLine)` with the user's court before flatten (pdf-lib accepts arbitrary values this way; pdftk flatten renders them fine). Select `""` when court unknown so the "SELECT A COURT..." placeholder never prints.
2. Static header "Pinal County Justice Courts, State of Arizona" (page 1, x 197–470, y 44–57 from top) — white-rect + redraw with the user's county.
3. Pinal County seal image top-left (x ~84–166, y ~7–91) — white-rect out for non-Pinal counties.

**Why:** users outside Pinal County must not see Pinal courts/branding on their filed complaint.
**How to apply:** logic lives in the AZ complaint form definition (`resolveAzCourtLine` / `resolveAzCountyName`). Note: white rects only cover visually — the Pinal text remains in the PDF text layer (pdftotext still extracts it), so visual/pixel checks are needed, not text greps. `countyId` in real cases may be a county-level slug (`az-maricopa`) or a precinct record id — resolution handles both.

---
name: Government PDF Download Blockers
description: Which state court websites block automated PDF downloads and why, as of July 2026
---

# Summary

When building official-PDF-backed forms, automated `curl` downloads of government court PDFs are frequently blocked. Here are the confirmed outcomes by state:

## NC — nccourts.gov (Cloudflare WAF) — RESOLVED
- **Block method:** Cloudflare WAF returns HTTP 403 for all non-browser requests
- **Affected forms:** AOC-CVM-200, AOC-CVM-100, AOC-G-106
- **Resolution:** Manual browser download succeeded; PDF stored at `artifacts/api-server/assets/nc-forms/nc-aoc-cvm-200.pdf`
- **Form details:** Landscape 792×612 pts, AcroForm fields (pdftk FDF fill confirmed working). County fields: County1 (header, centered), County2 (plaintiff section), County3 (defendant section), County4 (second defendant)

## WA — courts.wa.gov (HTML redirect) — RESOLVED
- **Block method:** All `/content/publicUpload/` and `/forms/documents/` PDF URLs return HTTP 200 but with 3,623-byte HTML (a JavaScript-gated download page)
- **Affected forms:** MISC 05.0100, MISC 05.0200
- **Resolution:** Manual browser download succeeded; PDF stored at `artifacts/api-server/assets/wa-forms/wa-misc-05-0100.pdf`
- **Form details:** Portrait 612×792 pts, 3 pages, NO AcroForm fields — coordinate overlay via pdf-lib (pdftotext bbox mapping)

## IL — illinoiscourts.gov (HTML 404 page)
- **Block method:** All PDF paths return HTTP 404 but with a 143 KB HTML error page (not a true 404 body)
- **Affected forms:** Small Claims Summons
- **Tried URL patterns:** `/docs/default-source/forms-documents/small_claims_summons.pdf`, `/docs/default-source/approved-forms/SC100.pdf`, etc.
- **Workaround needed:** Find the correct form slug from the website's form listing (requires browser/JS)

## TX — txcourts.gov (media IDs change with form revisions)
- **Block method:** OCA form PDFs use opaque numeric media IDs (e.g., `/media/1460791/sc1.pdf`) that change every time a form is updated — all tried IDs return HTTP 404
- **Affected forms:** SC-1 Petition, SC-2 Citation
- **Workaround needed:** Visit the TX OCA forms page in a browser to get the current media ID, then download manually

## FL SOC — no AcroForm fields
- **Issue:** The statewide FL Statement of Claim PDF (3 pages, ~71 KB) was successfully downloaded but has ZERO AcroForm fields (`pdftk dump_data_fields` returns nothing)
- **Workaround needed:** Coordinate overlay via pdftotext bbox mapping — requires manual visual calibration

## VA — success
- **DC-402:** Downloaded at `https://www.vacourts.gov/forms/district/dc402.pdf` — no bot protection
- **DC-409:** Downloaded at `https://www.vacourts.gov/forms/district/dc409.pdf` — no bot protection
- vacourts.gov does not use Cloudflare or JS-gated downloads for their form PDFs

**Why this matters:** Before writing any new official-PDF form definition, verify the PDF can be downloaded with `curl -sL --max-time 10 -o /tmp/test.pdf <url> && head -c 5 /tmp/test.pdf` — if it doesn't start with `%PDF`, the programmatic approach must be used instead.

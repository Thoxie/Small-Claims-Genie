---
name: Clerk-signed summons forms carry no plaintiff signature
description: Which court forms the plaintiff files but does NOT sign, so a future agent doesn't re-add a signature block as a "fix"
---

# Clerk-signed summons forms carry no plaintiff signature

Some non-CA forms are filed BY the plaintiff but signed by the court clerk /
deputy clerk, NOT the plaintiff. These must render with the plaintiff's contact
info (the "FILED BY" / caption block) but **no plaintiff signature line or image**,
even in the `signed` variant. The clerk/deputy-clerk signature line is left blank
for the court to complete.

Confirmed instance: **FL CLK-CT-423 (Miami-Dade summons)** — plaintiff signature
block intentionally absent; deputy-clerk line blank.

**Why:** A conspicuously "missing" signature on a court form looks like a bug and
invites a well-meaning agent to draw a plaintiff signature back in. That would be
legally wrong for a clerk-issued summons and would regress the form.

**How to apply:** Before adding/moving a signature on any summons or clerk-issued
form, check who actually signs it (clerk vs. plaintiff). If the clerk signs,
render contact/caption data only and leave the signature line blank. Contrast
with the shared FL Statement of Claim builder, where the plaintiff DOES sign via
a typed "/name/" block (not a floating image).

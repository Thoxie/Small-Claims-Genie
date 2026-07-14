# Small Claims Genie — Core User Feature Guide

**Version:** July 2026
**Product:** Small Claims Genie (smallclaimsgenie.com)
**Platform:** Web (desktop + mobile) + iOS/Android mobile app

---

## What Is Small Claims Genie?

Small Claims Genie is an AI-powered legal assistant that helps individuals and small businesses prepare and file small claims court cases — without hiring a lawyer. It guides you through every step of the process, from writing a demand letter to downloading your filled, court-ready forms.

**Who it is for:**
- Individuals owed money by landlords, contractors, businesses, or other people
- Small businesses with unpaid invoices or broken contracts
- Anyone who has experienced property damage, auto accidents, or consumer fraud and wants to recover money through court

**What it is not:**
- A law firm or attorney
- A case filing service (you file your own paperwork with the court)
- Available for criminal cases, family law, or cases over each state's small claims limit

---

## Business Model

Small Claims Genie is **free to prepare** and **paid to download** your final signed court forms.

| What's free | What's paid |
|---|---|
| Full case intake and setup | Downloading your signed, court-ready PDF forms |
| AI Case Advisor (unlimited questions) | — |
| Document upload and OCR | — |
| Demand letter generation | — |
| Hearing preparation | — |
| Readiness score and case review | — |

One-time payment per case. No subscriptions required.

---

## Supported States

Small Claims Genie currently covers **9 U.S. states**, each with its own court-specific forms:

| State | Court System | Claim Limit |
|---|---|---|
| California | Small Claims Court | $12,500 (individual) / $6,250 (business) |
| Florida | County Court Small Claims | $8,000 |
| Texas | Justice of the Peace (JP) Courts | $20,000 |
| Illinois | Circuit Court Small Claims | $10,000 |
| New Jersey | Special Civil Part — Small Claims Section | $5,000 |
| North Carolina | District Court / Magistrate Court | $10,000 |
| Virginia | General District Court — Small Claims Division | $5,000 |
| Washington | District Court — Small Claims Department | $10,000 (individual) / $5,000 (business) |
| Arizona | Small Claims Division of the Justice Court | $5,000 |

The correct court forms for your state and county are generated automatically based on your case information.

---

## Getting Started

### 1. Create an Account

Sign up at smallclaimsgenie.com using your email address or Google account. Authentication is handled through Clerk — your login credentials are never stored directly on our servers.

### 2. Start a New Case

From the dashboard, click **New Case**. You'll be asked to:
- Select your **state** (determines which court system and forms apply)
- Select your **county** (determines the specific courthouse and filing rules)
- Give the case a short internal name (e.g., "ABC Contractor — unpaid work")

Once created, the case opens in the **Case Workspace** — a 7-step guided workflow.

---

## The Case Workspace — 7-Step Workflow

Each case has a dedicated workspace with 7 guided steps, each with a tutorial video. Your progress is saved automatically as you work.

### Step 1 — Parties (Intake)
*Enter who is suing whom.*

**Plaintiff (you):**
- Legal name and address
- Phone and email
- Optional: mailing address if different from filing address
- Optional: DBA ("doing business as") name if you operate under a business name
- Optional: additional plaintiff (e.g., a spouse or business partner)
- Entity type: individual, sole proprietor, LLC, corporation, or partnership

**Defendant (the person or business you're suing):**
- Legal name and address
- Phone and email (if known)
- Optional: DBA name for businesses
- Optional: registered agent address (for corporations/LLCs — required in some states)
- Multiple defendants supported

The system automatically validates required fields and highlights anything missing before you can proceed.

---

### Step 2 — Case Details (Intake, continued)
*Describe what happened and how much you're claiming.*

- **Claim amount** — the exact dollar amount you are suing for
- **Claim type** — choose from categories like:
  - Unpaid loan or debt
  - Breach of contract
  - Property damage
  - Security deposit
  - Unpaid wages
  - Consumer dispute
  - Auto negligence
  - Landlord/tenant
  - Bad check
  - Other
- **Incident date** — when the problem occurred (used for statute of limitations check)
- **Hearing date** — if already scheduled
- **Claim description** — a plain-language summary of what happened and why the defendant owes you money (this is used to populate court forms and AI features)
- **Prior demand** — whether you have already demanded payment in writing

The system checks your claim amount against your state's statutory limit and warns you if you're over the cap.

---

### Step 3 — Documents
*Upload your evidence.*

Upload any documents that support your case:
- Contracts or agreements
- Invoices and receipts
- Text messages and emails (screenshots)
- Photos of damage
- Bank statements
- Police reports
- Lease agreements
- Any other supporting evidence

**Supported formats:** PDF, JPG, PNG, HEIC, and most common document types.

**AI-powered OCR (Optical Character Recognition):**
When you upload a document, the system automatically reads it using OpenAI Vision and extracts the text. This extracted text:
- Becomes searchable within your case
- Is used by the AI Case Advisor to answer questions about your evidence
- Can be referenced when generating declarations and demand letters

**Document management:**
- Documents are stored securely in Google Cloud Storage
- You can upload multiple documents per case
- Each document shows its upload date, file type, and OCR status
- Documents contribute to your **Readiness Score**

---

### Step 4 — Demand Letter
*Send a formal written demand before going to court.*

Most courts require (or strongly recommend) that you send a written demand before filing. The Demand Letter tab has three tools:

#### Demand Letter Generator
- Enter the **tone** you want: Professional, Firm, or Urgent
- Select whether to include a **payment deadline** (recommended: 14–30 days)
- Click **Generate** — the AI writes a complete, legally appropriate demand letter using your case details
- Generation streams in real time so you see it being written
- **Edit** the draft to add personal details or adjust the language
- **Download as PDF** — formatted and ready to send
- **Copy to clipboard** — paste into email

#### Settlement Offer (Step 2 of 3)
If the defendant responds and wants to negotiate, create a written settlement offer:
- Specify the amount you're willing to accept
- Set payment terms (lump sum or installments)
- Generate a professional offer letter
- Download as PDF or copy as text

#### Settlement Agreement (Step 3 of 3)
If both parties agree to settle, generate a binding written agreement:
- Documents the agreed amount and payment schedule
- Both parties sign
- If the defendant fails to pay, you can use this agreement to re-file or enforce

---

### Step 5 — AI Genie Case Review
*Ask the AI anything about your case.*

The AI Case Advisor is a streaming AI assistant trained specifically on small claims court procedures. It knows:
- Your case details (parties, amounts, claim type, dates)
- The specific rules for your state (claim limits, filing fees, statutes of limitations, service rules)
- Your uploaded documents (via OCR)
- The demand letters you've sent

**What you can ask:**
- "Do I have a strong case?"
- "What evidence do I still need?"
- "How does service of process work in my county?"
- "Is my claim within the statute of limitations?"
- "What should I say at the hearing?"
- "What happens if I win? How do I collect?"
- "Can I add interest to my claim?"

**Voice input:** Tap and hold the microphone button to ask questions by speaking. Your audio is transcribed using OpenAI Whisper and sent to the AI.

**Rate limits:** 30 AI interactions per hour per user account (shared across Case Advisor and Demand Letter features). This limit is generous enough for normal use and resets every hour.

---

### Step 6 — Court Forms
*Download your filled court forms.*

This is where you get your court-ready PDF documents. The system fills in all the forms automatically using the information from your intake.

**How it works:**
1. The correct forms for your state and county are shown automatically
2. Review a summary of what will be filled in
3. Click **Sign & Download** (paid) or **Download** (unsigned preview)
4. For paid downloads: draw or type your signature in the signature pad, then download the completed, signed PDF

**Signature options:**
- Draw with your finger or mouse
- Type your name (rendered as a signature font)

**What "signed" means:** Your signature image is embedded into the PDF at the legally correct position for that form. The PDF is then flattened so fields cannot be altered.

**Forms are pre-filled with:**
- Your name, address, phone, email
- Defendant's name, address
- Claim amount, claim type, case description
- County courthouse name and filing address
- Case number (if already assigned)
- Today's date

See the state-by-state form list in the next section.

---

### Step 7 — Hearing Prep
*Prepare for your day in court.*

The Hearing Prep tab helps you walk into your hearing confident and organized.

**What it offers:**

**Case Summary:** A one-page plain-language overview of your case — who you're suing, how much, why, and your key evidence points. Print and bring to court.

**AI Hearing Coach:** Tell the AI what's on your mind about the upcoming hearing. It will:
- Walk you through what to expect (how the courtroom works, what the judge/magistrate will ask)
- Help you organize your opening statement
- Suggest questions to ask the defendant
- Coach you on how to present your evidence clearly
- Explain how to handle objections or surprises

**Checklist:** A to-do list for the days before your hearing:
- Confirm courthouse address and parking
- Organize originals and copies of all documents
- Notify any witnesses
- Arrive 15 minutes early
- What to say and what NOT to say

---

## Feature Deep Dives

### Readiness Score

Every case displays a **Readiness Score from 0 to 100** in the top right of the workspace. It measures how prepared your case is across three categories:

| Category | Max Points | What drives it |
|---|---|---|
| Intake completeness | 60 pts | How fully you've filled in Step 1 and Step 2 |
| Evidence uploaded | 30 pts | Whether you've uploaded supporting documents |
| Demand letter sent | 10 pts | Whether you've generated at least one demand letter |

A score of 70+ means you have a well-prepared case. A score under 50 means there are significant gaps — the system will tell you exactly what's missing.

---

### Court Forms by State

All forms are generated server-side using your case data. No manual typing required.

#### California (CA)
| Form | Purpose |
|---|---|
| SC-100 | Plaintiff's Claim — the main filing form |
| SC-100A | Amendment to your claim |
| SC-103 | Fictitious Business Name Declaration (if suing/sued under a DBA) |
| SC-104 | Proof of Service by Mail |
| SC-105 | Proof of Service — Personally Delivered |
| SC-112A | Request for Entry of Judgment |
| SC-120 | Defendant's Claim (if defendant wants to countersue) |
| SC-140 | Claim of Exemption |
| SC-150 | Request to Postpone Trial |
| MC-030 | Declaration — attach supporting facts (AI-generated with exhibit assembly) |
| FW-001 | Fee Waiver — apply to waive filing fees |

#### Florida (FL)
Forms are county-specific. The correct version is selected automatically based on your county.
- **Statement of Claim** (Forms 7.330–7.337, dispatches by claim type — all 67 counties)
- **Summons / Notice to Appear** (Form 7.322 — all 67 counties)
- **Proof of Service** (Form 7.340)
- **Application for Civil Indigent Status** (fee waiver)
- **County-specific versions** for: Miami-Dade (CLK/CT.333, CLK/CT.423), Volusia (CL-219), Broward, Orange, Hillsborough, Palm Beach

#### Texas (TX)
- **Small Claims Petition** — the main filing form (all 254 counties)
- **Citation** — court-issued notice served on defendant
- **Return of Service** — proof defendant was served
- **Affidavit of Inability to Pay** — fee waiver
- **Travis County Precinct 2 Petition** (J2-CV)
- **Travis County Precinct 5 Petition** (J5-CV)
- **Denton County Citation Request**

#### Illinois (IL)
- **Small Claims Complaint** — the main filing form (all 102 counties)
- **Summons** — notifies defendant (clerk completes dates/stamp)
- **Proof of Service**
- **Application for Waiver of Court Fees**
- **Letter to the Sheriff** — instructs the sheriff on serving the defendant

#### New Jersey (NJ)
- **CN 10532 — Small Claims Complaint** (Appendix XI-C) — for most claim types
- **CN 10148 — Motor Vehicle Complaint** — shown automatically for Auto Negligence cases

#### North Carolina (NC)
- **AOC-CVM-200 — Complaint for Money Owed** — the main filing form
- **AOC-CVM-100 — Magistrate's Summons** — bring to clerk; clerk completes and issues
- **AOC-G-106 — Petition to Sue as Indigent** — fee waiver

#### Virginia (VA)
- **DC-402 — Warrant in Debt** — the main filing form
- **DC-409 — Petition to Proceed In Forma Pauperis** — fee waiver

#### Washington (WA)
- **MISC 05.0100 — Notice of Small Claim** — the main filing form
- **MISC 05.0200 — Certificate of Service** — proof of service

#### Arizona (AZ)
- **LJSC00001F — Small Claims Complaint** — the main filing form
- **LJSC00002F — Small Claims Summons**
- **LJSC00003F — Proof of Service by Certified Mail**

---

### AI Features Summary

| Feature | Where | What it does |
|---|---|---|
| Case Advisor | Step 5 — AI Chat tab | Answers questions about your specific case; knows your facts, state rules, and documents |
| Help Genie | Public homepage chatbot | Answers general small claims questions for anonymous visitors; converts to sign-up |
| Demand Letter AI | Step 4 — Demand Letter tab | Generates a complete demand letter in your chosen tone |
| Settlement AI | Step 4 — Settlement tab | Generates settlement offer and agreement letters |
| SC-105 AI Draft | CA forms — SC-105 | Drafts the proof of service narrative from your case details |
| MC-030 AI Draft | CA forms — MC-030 | Generates a declaration with your case facts; optionally assembles exhibit pages |
| Hearing Coach | Step 7 — Hearing Prep tab | Coaches you on what to say and expect in court |
| SC-100 AI Enrichment | CA forms — SC-100 | AI enhances the SC-100 narrative fields for clarity and completeness |
| OCR | Step 3 — Documents tab | Reads and extracts text from uploaded documents for AI awareness |
| Voice Input | Step 5 — AI Chat tab | Speak your questions; transcribed via OpenAI Whisper |

**AI rate limit:** 30 interactions per hour per user account. Resets automatically. This is shared across all AI features.

---

### Document Upload & OCR

**How to upload:**
- Tap or click the upload area in Step 3
- Or drag-and-drop files directly onto the upload zone
- On mobile, you can take a photo directly with your camera

**OCR process:**
1. File is uploaded securely to cloud storage
2. OpenAI Vision reads the document and extracts all visible text
3. Text is stored alongside the document in your case
4. Status shows: "Processing..." → "OCR Complete" (or "OCR Failed" if the image was too unclear)

**What OCR enables:**
- The AI Case Advisor can read and reference your contracts, receipts, and correspondence
- The declaration generator (MC-030) can pull key facts from your documents
- Evidence is searchable within your case

**Security:** All documents are stored encrypted in Google Cloud Storage. Only you and the system can access your files.

---

### Voice Input

Available in the AI Case Advisor (Step 5):

1. Tap and **hold** the microphone button
2. Speak your question clearly
3. Release the button
4. Your speech is sent to OpenAI Whisper for transcription
5. The transcribed text appears in the input field — you can edit it before sending
6. The AI responds as normal

Voice input is particularly useful on mobile where typing long questions is inconvenient.

---

### Fee Waiver Support

Every supported state has a fee waiver form (or equivalent) available in the Court Forms tab. If you cannot afford the filing fee, download the fee waiver form, complete the financial eligibility section by hand, and submit it with your complaint.

States with fee waiver forms:
- CA: FW-001
- FL: Application for Civil Indigent Status
- TX: Affidavit of Inability to Pay
- IL: Application for Waiver of Court Fees
- NC: AOC-G-106 (Petition to Sue as Indigent)
- VA: DC-409 (Petition to Proceed In Forma Pauperis)
- AZ: AOCDFGF1F (referenced in the forms tab)

---

## Mobile App

Small Claims Genie has a companion iOS/Android mobile app built with Expo (React Native). It provides access to all case features in a mobile-optimized interface, including:
- Case creation and full intake workflow
- Document camera upload (take photos of evidence directly)
- AI Case Advisor with voice input
- Demand letter generation
- Court forms download
- Push notifications for upcoming hearing dates

---

## Data & Privacy

- **Account data** is stored in a PostgreSQL database managed by Replit
- **Documents** are stored in Google Cloud Storage with encrypted URLs
- **Authentication** is managed by Clerk — passwords are never stored on our servers
- **AI conversations** are sent to OpenAI's API; no conversation history is stored beyond your session
- **Payment processing** is handled by Stripe — card numbers are never stored on our servers

---

## Frequently Asked Questions

**Q: Do I need a lawyer?**
A: No. Small claims court is designed for self-represented parties. In most states (CA, AZ, VA, WA), attorneys are actually NOT allowed at the hearing. Small Claims Genie helps you prepare without legal representation.

**Q: Can I use this for any state?**
A: Currently 9 states are supported (CA, FL, TX, IL, NJ, NC, VA, WA, AZ). More states are being added regularly.

**Q: What if my claim is over the limit?**
A: You can reduce your claim to fit within the limit (and waive the excess), or file in a higher court (Small Claims Genie only covers small claims — higher courts require an attorney for most cases).

**Q: Does the app file my forms for me?**
A: No. Small Claims Genie prepares your court-ready PDF forms. You print them (or take them to the courthouse on your phone/tablet) and file them yourself at the clerk's window. Some counties allow e-filing — the app notes this where applicable.

**Q: What if the defendant doesn't show up?**
A: You will likely receive a default judgment in your favor. The AI Case Advisor can walk you through what to do next to collect.

**Q: What happens after I win?**
A: Winning the judgment is step one. If the defendant doesn't pay voluntarily, you may need to use collection tools (wage garnishment, bank levy, property lien). The AI Case Advisor explains your state's collection options.

**Q: Is my demand letter admissible in court?**
A: Generally yes — a written demand shows the court you attempted to resolve the dispute before filing. Keep a copy and proof of delivery (certified mail receipt).

**Q: What if the other party countersues?**
A: In most states, defendants can file a counterclaim. If you receive one, the AI Case Advisor can help you understand it. CA users: SC-120 is available in the Court Forms tab.

---

## Glossary

| Term | Meaning |
|---|---|
| Plaintiff | The person filing the lawsuit (you) |
| Defendant | The person or business being sued |
| Claim amount | The dollar amount you are asking the court to award |
| Statute of limitations | The deadline by which you must file your case |
| Service of process | Officially notifying the defendant that they are being sued |
| Proof of service | A document proving the defendant was properly notified |
| Default judgment | A win by the plaintiff because the defendant didn't respond or appear |
| Demand letter | A formal written request for payment before filing suit |
| Fee waiver | A court order excusing you from paying filing fees if you cannot afford them |
| Continuance / Postponement | Moving the hearing to a later date |
| Magistrate | The judge or hearing officer in some states (NC, VA) |
| JP Court | Justice of the Peace Court (Texas) |

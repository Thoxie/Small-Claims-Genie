# Small Claims Genie

**AI-powered California small claims court assistant for everyday people.**

Small Claims Genie walks lower-income individuals and small businesses through every step of a California small claims case — from intake and evidence to court-ready PDF forms, demand letters, and hearing preparation. No lawyer required.

Live at → **[smallclaimsgenie.com](https://smallclaimsgenie.com)**

---

## What It Does

| Feature | Description |
|---|---|
| **Guided Intake** | Collects all case information needed to auto-fill court forms |
| **Document Upload + OCR** | Upload contracts, receipts, photos, texts — AI reads and indexes them |
| **Ask Genie AI** | SSE-streaming AI chat grounded on uploaded documents + CA court rules |
| **Voice Input** | Hold-to-record mic in chat and hearing prep (Whisper transcription) |
| **Demand Letter Generator** | AI-generated demand letters in three tones (firm / neutral / conciliatory) |
| **Settlement Offer Generator** | Strategic offer letter with slider for 50–100% of claim amount |
| **Settlement Agreement Generator** | Binding mutual release agreement with payment terms |
| **Court Forms** | SC-100, MC-030, SC-104, FW-001, SC-100A, SC-103, SC-105, SC-112A, SC-120, SC-140, SC-150 — all 11 CA small claims forms |
| **SC-100 PDF Auto-Fill** | Official form background + typed data overlay, court-ready for printing; View filled form in-browser, Edit any field before download |
| **Case Advisor** | AI analysis of case strength with evidence checklist per claim type |
| **Hearing Prep** | Practice Hearing Session (AI-simulated court Q&A) + Opening Statement Builder |
| **Deadline Calculator** | SOL by claim type (CCP §§337–339), service windows, 70/30-day business rules, appeal window |
| **All 58 CA Counties** | Filing details, courthouse lookup, local rules for every county |
| **Email Reminders** | 8 automated hearing reminder emails (7 days → day of) via Resend |
| **Case Readiness Score** | 0–100 score based on intake completeness, documents uploaded, and prior demand |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | pnpm workspaces |
| **Runtime** | Node.js 24 |
| **Language** | TypeScript 5.9 (strict, composite projects) |
| **API** | Express 5 |
| **Frontend** | React 18 + Vite 7 |
| **UI Components** | shadcn/ui + Tailwind CSS |
| **Database** | PostgreSQL + Drizzle ORM |
| **Validation** | Zod v4 + drizzle-zod |
| **API Codegen** | Orval (OpenAPI → React Query hooks + Zod schemas) |
| **AI** | OpenAI (gpt-5.2 for chat/hearing/demand, gpt-4o for MC-030, gpt-4o-mini for guardrails) |
| **PDF Generation** | pdf-lib (official form PNG backgrounds + text overlays) |
| **OCR** | OpenAI Vision API (async, runs on upload) |
| **Voice** | Web Speech API (recording) + OpenAI Whisper (transcription) |
| **Auth** | Clerk (JWT-protected API, hosted sign-in/sign-up UI) |
| **File Storage** | Replit Object Storage (GCS-backed) |
| **Email** | Resend |
| **Deployment** | Replit (published at smallclaimsgenie.com) |

---

## Repository Structure

```
artifacts/
  api-server/                     # Express 5 API (port auto-assigned by Replit)
    src/
      routes/
        health.ts                 # GET /api/healthz
        counties.ts               # GET /api/counties — all 58 CA counties
        cases.ts                  # Cases CRUD, intake, readiness score
        documents.ts              # File upload (multer) + async OCR
        chat.ts                   # SSE streaming AI chat
        forms.ts                  # SC-100 + all form PDF generation
        demand-letter.ts          # SSE streaming demand/settlement/agreement gen
        hearing-prep.ts           # Practice hearing AI session
        transcribe.ts             # POST /api/transcribe — Whisper voice transcription
        advisor.ts                # Case strength analysis + evidence checklist
        reminders.ts              # Email reminder scheduling
      lib/
        rate-limiter.ts           # 30 AI calls/user/hour (in-memory)
        reminder-scheduler.ts     # 8-email hearing reminder system (runs hourly)
        topic-guard.ts            # Off-topic guardrail (gpt-4o-mini classifier)
    assets/
      sc100_hq-{1,2,3,4}.png     # Official SC-100 pages at 300 DPI

  small-claims-genie/             # React + Vite frontend (previewPath /)
    src/
      pages/
        landing.tsx               # / — Hero, features, CTA
        dashboard.tsx             # /dashboard — Case list + stats
        cases/
          workspace.tsx           # /cases/:id — 7-tab case workspace
          tabs/
            intake-tab.tsx        # Tab 1: Case intake form
            documents-tab.tsx     # Tab 2: Document upload + checklist
            chat-tab.tsx          # Tab 3: Ask Genie AI (SSE chat + voice)
            demand-letter-tab.tsx # Tab 4: Demand/settlement/agreement generator
            forms-tab.tsx         # Tab 5: Court forms (SC-100 auto-fill + catalog)
            hearing-prep-tab.tsx  # Tab 6: Practice hearing + statement builder
            deadline-calculator-tab.tsx  # Tab 7: CA deadline calculator
        how-it-works.tsx
        faq.tsx
        types-of-cases.tsx
        resources.tsx
        counties.tsx
        sign-in.tsx / sign-up.tsx
        tos.tsx / terms.tsx
      components/
        layout.tsx                # Nav + footer
        draft-overlay.tsx         # DraftModeBanner, DraftOverlay, DraftLockedButton
        ui/                       # shadcn/ui (40+ components)
      lib/
        i18n.ts                   # All UI strings (Spanish-ready)

lib/
  api-spec/openapi.yaml           # OpenAPI source of truth
  api-client-react/               # Generated React Query hooks (orval)
  api-zod/                        # Generated Zod schemas (orval)
  db/src/schema/
    cases.ts                      # cases table
    documents.ts                  # documents + OCR status
    chat_messages.ts              # chat history
  integrations-openai-ai-server/  # Pre-configured OpenAI server client
  integrations-openai-ai-react/   # useVoiceRecorder hook
```

---

## Getting Started

### Prerequisites

- Node.js 24+
- pnpm 9+
- PostgreSQL database
- Clerk account (free tier works)
- OpenAI API key (via Replit AI Integrations or direct)
- Resend account (for email reminders)

### 1. Clone and install

```bash
git clone https://github.com/Thoxie/Small-Claims-Genie.git
cd Small-Claims-Genie
pnpm install
```

### 2. Set environment variables

Create a `.env` file in the repo root (or set secrets in your hosting platform):

```env
# Clerk Auth
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Session
SESSION_SECRET=<random 32+ character string>

# Database (auto-set by Replit PostgreSQL)
DATABASE_URL=postgresql://...

# Email (Resend)
RESEND_API_KEY=re_...

# Object Storage (auto-set by Replit App Storage)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
PRIVATE_OBJECT_DIR=...
PUBLIC_OBJECT_SEARCH_PATHS=...
```

### 3. Run the database migration

```bash
pnpm --filter @workspace/db run push
```

### 4. Start development servers

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Frontend
pnpm --filter @workspace/small-claims-genie run dev
```

---

## Key Architecture Decisions

### AI Models
| Use | Model |
|---|---|
| Chat, hearing prep, demand/settlement letters | `gpt-5.2` |
| MC-030 Declaration auto-fill | `gpt-4o` |
| Off-topic guardrail classifier | `gpt-4o-mini` |
| OCR (document reading) | OpenAI Vision |
| Voice transcription | OpenAI Whisper |

All AI responses use `max_completion_tokens: 8192`. Chat and demand letter generation use SSE streaming.

### Case Readiness Score (0–100)
- **60 pts** — Intake completeness (name, defendant, amount, description, county, date)
- **30 pts** — Documents uploaded and OCR complete
- **10 pts** — Prior demand made

### SC-100 PDF Generation
The SC-100 is generated by placing official form PNG backgrounds (300 DPI, 4 pages) and overlaying typed case data using pdf-lib at bbox-derived coordinates. All text is Helvetica 9pt. Checkboxes render as an X centered on the pre-printed box.

### Authentication
All API routes are protected with Clerk JWT middleware. The frontend attaches `Authorization: Bearer <token>` to every request. The Vite dev proxy (`/api → localhost`) bypasses Replit's internal proxy which would otherwise strip auth headers from POST requests.

### File Storage
Documents are uploaded via multer and stored in Replit Object Storage (GCS-backed). The `storageObjectPath` is persisted in the database. Legacy rows with base64 `fileData` are still served from the DB for backward compatibility.

### Rate Limiting
AI endpoints (`/chat`, `/demand-letter`, `/advisor/analyze`) are rate-limited to **30 calls per user per hour** using an in-memory store (`rate-limiter.ts`).

### Email Reminders
The reminder scheduler runs hourly and sends up to 8 emails per hearing: 7 days before, 5 days, 3 days, 2 days, 1 day, day-of morning, day-of 1 hour before, and a post-hearing follow-up. All emails are sent via Resend from `noreply@smallclaimsgenie.com`.

---

## Claim Types Supported

- Money Owed
- Unpaid Debt
- Security Deposit
- Property Damage
- Contract Dispute
- Fraud
- Other

Statutes of limitation are calculated per claim type under CCP §§337–339 (2–4 years).

---

## Dollar Limits (CA 2026)

| Plaintiff Type | Limit |
|---|---|
| Individual | $12,500 |
| Business | $6,250 |

---

## Tab Structure (Case Workspace)

The workspace nav bar shows: **[Logo] [Exit Case | Intake | Docs | Ask Genie AI | Demand Letter | Court Forms | Prep for Hearing | Deadlines] [User Avatar]**

Exit Case (LogOut icon) is equidistant with all other tabs and returns the user to the dashboard. The logo is displayed at full nav height on the left, pushed right for visual balance.

| # | Tab | Purpose |
|---|---|---|
| — | Exit Case | Returns user to case dashboard; styled identically to workspace tabs |
| 1 | Intake | All case details — plaintiff, defendant, incident, amount, county |
| 2 | Docs | Upload evidence — OCR auto-runs; document checklist from AI advisor |
| 3 | Ask Genie AI | Streaming AI chat grounded on uploaded documents |
| 4 | Demand Letter | Generate demand letter, settlement offer, or settlement agreement |
| 5 | Court Forms | SC-100 auto-fill + all 11 CA small claims forms with guides |
| 6 | Prep for Hearing | Practice hearing session + opening statement builder |
| 7 | Deadlines | SOL calculator, service windows, appeal deadlines |

---

## Restoring to a New Environment

If importing to a fresh Replit project from this GitHub repo:

1. `pnpm install`
2. Set all secrets listed in the Environment Variables section above
3. Provision a PostgreSQL database (sets `DATABASE_URL` automatically in Replit)
4. `pnpm --filter @workspace/db run push`
5. Start both workflows: API Server and web

---

## Scripts

```bash
pnpm run build              # Typecheck + build all packages
pnpm run typecheck          # tsc --build --emitDeclarationOnly
pnpm --filter @workspace/db run push   # Push schema to database
```

---

## Target Users

Lower-income California residents and small businesses who need to file or defend a small claims case. The app is designed mobile-first, in plain English, with no legal jargon. Spanish localization is architecturally ready via `i18n.ts`.

---

## Legal Disclaimer

Small Claims Genie is not a law firm and does not provide legal advice. All content is for informational and self-help purposes only. Users should consult a licensed attorney for legal advice specific to their situation.

---

## License

Private / proprietary. All rights reserved.

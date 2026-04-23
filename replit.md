# Small Claims Genie — Workspace

## Agent Instructions

1. **GitHub — never push automatically.** Do not push to GitHub unless the user explicitly gives the instruction to do so. No automatic pushes after commits or after completing work.

2. **Always confirm when code is live.** After finishing and deploying code changes to the running application, tell the user clearly that the changes are live. If the update requires the user to republish the app (via the Replit deploy button) to go live on the public URL, say so explicitly.

3. **Collaboration protocol — ask questions when relevant, present options.** This is a collaboration. The user is the owner; the agent is the lead developer. When a decision point arises that requires the user's input, ask — but only if it is genuinely needed and will save rework. Do not ask unnecessary questions. When presenting choices, always offer exactly three options and clearly mark the recommended one as Option 1. Format: Option 1 (Recommended): ..., Option 2: ..., Option 3: ...

## Overview

California small claims court SaaS app. Helps lower-income individuals and small businesses navigate CA small claims court. Full-stack pnpm monorepo with Express API, React+Vite frontend, PostgreSQL database, and AI-powered features (OCR, chat, voice).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- **Build**: esbuild (API), Vite (frontend)
- **AI**: OpenAI via Replit proxy (`@workspace/integrations-openai-ai-server`, `@workspace/integrations-openai-ai-react`)
- **PDF generation**: Playwright + Chromium (headless) for SC-100 — HTML/CSS absolute positioning over base64-embedded 300 DPI PNG backgrounds, rendered by Chromium to PDF (eliminates React-PDF coordinate approximation errors); pdf-lib for MC-030 and other older forms

## Branding

- **Brand**: Small Claims Genie
- **Logo**: `attached_assets/2small-claims-genie-logo.png_1775057452576.png`
- **Colors**: Deep navy blue (primary), rich gold (accent), electric blue (AI/tech highlight)
- **Users**: Lower-income, mobile-first, many Hispanic; plain English, no legal jargon

## Structure

```text
artifacts/
  api-server/       # Express 5 API server (port 8080)
    src/routes/
      health.ts       # GET /api/healthz
      counties.ts     # GET /api/counties (all 58 CA counties hardcoded)
      cases.ts        # Cases CRUD + stats + intake + readiness score algorithm
      documents.ts    # File upload (multer) + async OCR (OpenAI vision)
      chat.ts         # SSE streaming AI chat + buildCaseContext() grounding
      forms.ts        # SC-100 PDF generation (pdf-lib, navy/gold branded)
      transcribe.ts   # POST /api/transcribe — voice audio → Whisper transcription
      demand-letter.ts # SSE streaming demand letter gen; GET/POST /cases/:id/demand-letter + /pdf
  small-claims-genie/  # React+Vite frontend (previewPath /)
    src/
      pages/
        landing.tsx           # / — Hero, features, CTA
        dashboard.tsx         # /dashboard — Case list + stats cards
        resume.tsx            # /resume — Resume an in-progress case
        cases/new.tsx         # /cases/new — Quick-start case creation form
        cases/workspace.tsx   # /cases/:id — 5-tab workspace (Intake / Documents / AI Chat / Demand Letter / Forms)
        counties.tsx          # /counties — All 58 CA counties directory
        how-it-works.tsx      # /how-it-works — Step-by-step explainer
        faq.tsx               # /faq — Frequently asked questions
        types-of-cases.tsx    # /types-of-cases — Supported claim type descriptions
        resources.tsx         # /resources — Filing resources and links
        sc100-generator.tsx   # /sc100 — Standalone SC-100 PDF generator
        sign-in.tsx           # /sign-in — Clerk sign-in
        sign-up.tsx           # /sign-up — Clerk sign-up
        tos.tsx               # /tos — Terms of Service
        terms.tsx             # /terms — Terms of Use
        not-found.tsx         # catch-all 404
      components/
        layout.tsx            # Nav + footer wrapper
        ui/                   # Shadcn UI component library (40+ components)
      lib/
        i18n.ts               # All UI strings (single source — ready for Spanish translation)
lib/
  api-spec/openapi.yaml   # Source of truth for all endpoints
  api-client-react/       # Generated React Query hooks (orval)
  api-zod/                # Generated Zod schemas (orval)
  db/src/schema/
    cases.ts              # cases table (all SC-100 fields)
    documents.ts          # documents table (file storage + OCR)
    chat_messages.ts      # chat_messages table
    conversations.ts      # conversations table (template)
    messages.ts           # messages table (template)
  integrations-openai-ai-server/  # Pre-configured OpenAI client
  integrations-openai-ai-react/   # useVoiceRecorder hook
```

## UI Design Principles (Owner Preferences)

- **Consolidate, don't spread** — always try to fit related fields and controls into the most compact, readable layout possible. Avoid wide-open whitespace that forces unnecessary scrolling.
- **Size inputs to their content** — a "time" field should be narrow; a "case number" field medium; a "notes" field wider. Don't use full-width for everything by default.
- **Prioritize what matters** — most important information and actions go first (top of the page/card). Secondary or optional fields come after.
- **One line where possible** — headers, labels, and descriptions should be condensed to a single line whenever the meaning is clear. Avoid multi-line explanatory text unless truly necessary.
- **Users are mobile-first, non-technical** — plain language, clear affordances, no legal jargon. Buttons and actions should be immediately obvious.

## Key Design Decisions

- **Auth**: Clerk authentication is live (sign-in/sign-up via Clerk hosted UI). All protected routes require a valid Clerk JWT.
- **File storage**: Uploaded documents go to Google Cloud Storage (GCS) via presigned URLs. `storageObjectPath` is stored in the DB. Legacy rows with `fileData` (base64) are still served from DB for backwards compatibility. New uploads always use GCS.
- **AI rate limiting**: `artifacts/api-server/src/lib/rate-limiter.ts` — 30 AI calls per user per hour (in-memory). Applied to `/chat`, `/demand-letter`, and `/advisor/analyze` endpoints.
- **Object storage bucket**: `replit-objstore-fbe13e76-2c09-46f1-9698-68ef867b76ca` — provisioned via Replit App Storage (GCS-backed). Env vars: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`.
- **Pricing model**: SaaS — prepare case for free, pay to download final court forms. No Stripe integration yet; payment gate is planned.
- **OCR**: OpenAI vision API on upload (async, runs in `setImmediate`)
- **Chat**: SSE streaming via raw `fetch` + `ReadableStream` in frontend (NOT the generated hook)
- **Voice**: push-to-talk via `useVoiceRecorder` (hold mic → record → release → Whisper transcription via `/api/transcribe` → auto-send to AI)
- **Demand Letter**: SSE streaming generation + PDF download via `/cases/:id/demand-letter` and `/cases/:id/demand-letter/pdf`
- **SC-100 limits**: $12,500 individuals, $6,250 businesses (CA 2026)
- **All 58 CA counties** hardcoded in `artifacts/api-server/src/routes/counties.ts`
- **Files stored as base64** in `documents.fileData` column (postgres TEXT)
- **Readiness score**: 0-100 based on intake completeness (60pts) + docs (30pts) + prior demand (10pts)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from root** — run `pnpm run typecheck`
- **Project references** — when package A depends on B, A's `tsconfig.json` must list B in `references`

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/db run push` — push schema changes to database

## Express 5 Quirks

- `req.params.id` is `string | string[]` — always parse: `Array.isArray(req.params.id) ? req.params.id[0] : req.params.id`
- Async handlers must return `Promise<void>`
- The API build uses esbuild (not tsc), so TypeScript type errors won't fail the build
- **CRITICAL for form coordinate work**: The API server runs COMPILED code (`dist/index.mjs`), NOT source files directly. Editing `sc100-react-pdf.tsx` has NO effect until `restart_workflow("artifacts/api-server: API Server")` is called to trigger a fresh `pnpm run build`. All coordinate tests must be done after an explicit workflow restart.

## Environment

| Variable | Required | Description |
|---|---|---|
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret — from dashboard.clerk.com |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend publishable key — from dashboard.clerk.com |
| `SESSION_SECRET` | Yes | Random 32+ char string for session signing |
| `DATABASE_URL` | Yes | PostgreSQL connection string — auto-set by Replit DB |
| `PORT` | Yes | Server port — auto-assigned by Replit per artifact |

## Testing & Publishing

Before every publish, run the smoke test and follow the manual checklist:

```bash
bash scripts/smoke-test.sh   # 10 automated API checks (~10 seconds)
```

Then follow `PUBLISH_CHECKLIST.md` for the manual UI steps.

## SC-100 Form Architecture

The SC-100 PDF is generated using `@react-pdf/renderer` — a React JSX component (`sc100-react-pdf.tsx`) that renders case data over 300 DPI PNG form backgrounds.

### Coordinate System

- **Engine**: @react-pdf/renderer with CSS absolute positioning on a 612pt × 792pt page
- **Origin**: TOP-LEFT (unlike old pdf-lib which used bottom-left)
- **Helper functions in sc100-react-pdf.tsx**:
  - `py(y, size)` → converts bottom-up `y` to top-down CSS `top`: `792 - y - size*0.72`
  - `<T x y>` → positions text at (x, py(y)) in absolute CSS
  - `<X x y show>` → renders "X" mark at (x, py(y)) when `show === true`
  - `<W x y maxW lineH>` → wraps long text within a bounding box
- **PNG assets**: `artifacts/api-server/assets/sc100_hq-{1,2,3,4}.png` — 300 DPI, 2550×3300px

### Checkbox Calibration Methodology (pixel-verified)

Checkboxes were calibrated by scanning vertical strips of the blank form PNG at the checkbox x-column using ImageMagick to detect dark pixel runs. For each checkbox:
- Find the checkbox top border row (px from top of 2550×3300 image)
- `top_pdf_y_from_bottom = 792 - row * 72/300`
- `X_y = top_pdf_y_from_bottom - 8.1`  (centers 10pt "X" character vertically in 9pt box)
- `X_x = checkbox_center_x - 3.5`  (centers 7pt-wide "X" character horizontally in 9pt box)

### Verified Checkbox Coordinates (sc100-react-pdf.tsx)

All coordinates pixel-verified against `sc100_hq-3.png` and `sc100_hq-4.png` at 300 DPI:

**Page 3 checkboxes (sc100_hq-3.png):**
| Section | Element | x | y | Blank form rows |
|---|---|---|---|---|
| 4 Prior demand | Yes | 64 | 489 | ~1215 |
| 4 Prior demand | No | 116 | 489 | ~1215 |
| 5 Venue | Option a | 79 | 373 | 1714–1753 |
| 5 Venue | Option b | 79 | 317 | 1947–1985 |
| 5 Venue | Option c | 79 | 276 | 2116–2154 |
| 5 Venue | Option d | 79 | 249 | 2231–2270 |
| 5 Venue | Option e | 79 | 220 | 2350–2388 |
| 7 Atty fee | Yes | 358 | 153 | 2631–2668 |
| 7 Atty fee | No | 409 | 153 | 2631–2668 |
| 7 Arbitration | Check here | 503 | 138 | 2691–2728 |
| 8 Public entity | Yes | 244 | 118 | 2773–2811 |
| 8 Public entity | No | 295 | 118 | 2773–2811 |

**Page 4 checkboxes (sc100_hq-4.png):**
| Section | Element | x | y | Blank form rows |
|---|---|---|---|---|
| 9 12+ claims | Yes | 64 | 675 | ~391 |
| 9 12+ claims | No | 113 | 675 | ~391 |
| 10 Over $2500 | Yes | 276 | 657 | ~402 |
| 10 Over $2500 | No | 322 | 657 | ~402 |

### Text Field Calibrations (pixel-verified against 300dpi blank form)
| Field | x | y | lineH | Notes |
|---|---|---|---|---|
| Claim amount (§3 header) | 370 | 193 | — | Sits in fill blank right of "$" |
| Claim description (§3a) | 63 | 163 | 14 | First fill line below "a. Why..." label |
| Incident date (§3b) | 217 | 689 | — | On date fill blank |
| Date started (§3b range) | 335 | 673 | — | "Date started:" blank |
| Date through (§3b range) | 470 | 673 | — | "Through:" blank |
| How calculated (§3c) | 63 | 641 | 13 | First fill line of §3c |
| MC-031 checkbox | 63 | 579 | — | "Check here if you need more space" |
| Prior demand why not | 63 | 457 | 14 | Fill lines below "If no, explain why not:" |

### MC-031 Overflow Logic
- `claimDescriptionForForm`: if > 360 chars → truncates with "… (see MC-030)"; sets `needsMC031=true`
- `howAmountCalculated`: if > 210 chars → sets `needsMC031=true`

### Debug Endpoint
`GET /api/forms/sc100/debug-preview?mode=sample` → generates 4-page SC-100 with realistic sample data (no auth required).

## Restoring to a New Replit Project

If you ever need to restore this project from GitHub, follow these steps in order after importing the repo:

**Step 1 — Install dependencies**
```bash
pnpm install
```

**Step 2 — Set all 4 required secrets** (Replit sidebar → Secrets panel):
| Secret name | Where to get it |
|---|---|
| `CLERK_SECRET_KEY` | dashboard.clerk.com → your app → API Keys |
| `VITE_CLERK_PUBLISHABLE_KEY` | dashboard.clerk.com → your app → API Keys |
| `SESSION_SECRET` | Any random 32+ character string |
| `DATABASE_URL` | Auto-set when you provision a Replit PostgreSQL database |

See `.env.example` in the repo root for the exact format.

**Step 3 — Provision the database**

In Replit, click the Database icon in the left sidebar and create a PostgreSQL database. This sets `DATABASE_URL` automatically.

**Step 4 — Run the database migration**
```bash
pnpm --filter @workspace/db run push
```

**Step 5 — Start the workflows**

Replit will auto-detect the three workflows from `.replit`. Hit Run, or start each workflow manually:
- `artifacts/api-server: API Server`
- `artifacts/small-claims-genie: web`

The app will be fully functional once all secrets are in place and the database is migrated.

### Known Regression Patterns
- **Chat blank on send** — raw `fetch` in `ChatTab` (workspace.tsx) must use `useAuth().getToken()` and attach `Authorization: Bearer <token>`
- **POST /api/cases returns 401** — Vite proxy in `vite.config.ts` must be active; restart the frontend workflow if missing
- **Auth stripping on POST** — Replit's internal proxy strips auth headers from POST requests; the Vite proxy (`/api → localhost:18080`) is the fix
- **All API calls 401** — `AuthTokenBridge` in `App.tsx` sets `setAuthTokenGetter(() => getToken())` synchronously via `useMemo`

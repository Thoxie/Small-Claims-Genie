# Small Claims Genie — Workspace

## Agent Instructions

- **GitHub**: Never push to GitHub unless the user explicitly asks. No automatic pushes after commits.

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
- **PDF generation**: pdf-lib (SC-100 uses official PNG backgrounds + bbox-derived text overlays)

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

The SC-100 PDF is generated by embedding official form PNG backgrounds and overlaying typed case data at exact coordinates.

- **PNG assets**: `artifacts/api-server/assets/sc100_hq-{1,2,3,4}.png` — official SC-100 pages rendered at 300 DPI via `pdftoppm`
- **Coordinate system**: pdf-lib uses bottom-left origin; conversion from bbox (top-left): `pdf_y = 792 - bbox_yMax`
- **Font**: Helvetica 9pt for all typed data values
- **Checkboxes**: `xmark()` helper draws an X centred at the pre-printed checkbox square using the form's bbox-derived centre coordinates
- **Text wrapping**: `wrapVal()` helper wraps long text within a given width/line limit
- **Asset path at runtime**: `path.join(__dirname, '..', 'assets', 'sc100_hq-N.png')` — `__dirname` = `dist/` → resolves to `artifacts/api-server/assets/`
- **Page 1**: Official cover/instructions page — no data overlay (court clerk fills header boxes)
- **Pages 2-4**: Plaintiff, defendant, claim, venue, declaration items overlaid with case data

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

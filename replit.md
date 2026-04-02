# Small Claims Genie — Workspace

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
- **PDF generation**: pdf-lib

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
        landing.tsx       # / — Hero, CTA
        dashboard.tsx     # /dashboard — Case list + stats
        cases/new.tsx     # /cases/new — Quick-start form
        cases/workspace.tsx # /cases/:id — 5-tab workspace (Intake/Documents/AI Chat/Demand Letter/Forms)
        counties.tsx      # /counties — County directory
      components/
        layout.tsx        # Nav + footer
        ui/               # Shadcn components
      lib/
        i18n.ts           # All UI strings (single-file for future Spanish)
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

## Key Design Decisions

- **Stage 1**: No auth, no payments (Phase 2 adds Replit Auth + Stripe)
- **OCR**: OpenAI vision API on upload (async, runs in `setImmediate`)
- **Chat**: SSE streaming via raw `fetch` + `ReadableStream` in frontend (NOT the generated hook)
- **Voice**: push-to-talk via `useVoiceRecorder` (hold mic → record → release → Whisper transcription via `/api/transcribe` → auto-send to AI)
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

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — session secret (Phase 2)
- `PORT` — server port (auto-assigned per artifact)
- `BASE_PATH` — base URL path for frontend routing

## Testing & Publishing

Before every publish, run the smoke test and follow the manual checklist:

```bash
bash scripts/smoke-test.sh   # 10 automated API checks (~10 seconds)
```

Then follow `PUBLISH_CHECKLIST.md` for the manual UI steps.

### Known Regression Patterns
- **Chat blank on send** — raw `fetch` in `ChatTab` (workspace.tsx) must use `useAuth().getToken()` and attach `Authorization: Bearer <token>`
- **POST /api/cases returns 401** — Vite proxy in `vite.config.ts` must be active; restart the frontend workflow if missing
- **Auth stripping on POST** — Replit's internal proxy strips auth headers from POST requests; the Vite proxy (`/api → localhost:18080`) is the fix
- **All API calls 401** — `AuthTokenBridge` in `App.tsx` sets `setAuthTokenGetter(() => getToken())` synchronously via `useMemo`

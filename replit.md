# Small Claims Genie — Workspace

## Overview

Small Claims Genie is a California small claims court SaaS application designed to assist lower-income individuals and small businesses in navigating the CA small claims court system. It is a full-stack pnpm monorepo featuring an Express API, a React+Vite frontend, a PostgreSQL database, and integrates advanced AI capabilities including OCR, chat, and voice. The project aims to simplify legal processes, making them accessible and understandable, especially for mobile-first, non-technical users. The business vision is to offer a freemium model where users can prepare cases for free and pay to download final court forms.

## User Preferences

1.  **GitHub — never push automatically.** Do not push to GitHub unless the user explicitly gives the instruction to do so. No automatic pushes after commits or after completing work.
2.  **Always confirm when code is live.** After finishing and deploying code changes to the running application, tell the user clearly that the changes are live. If the update requires the user to republish the app (via the Replit deploy button) to go live on the public URL, say so explicitly.
3.  **Collaboration protocol — ask questions when relevant, present options.** This is a collaboration. The user is the owner; the agent is the lead developer. When a decision point arises that requires the user's input, ask — but only if it is genuinely needed and will save rework. Do not ask unnecessary questions. When presenting choices, always offer exactly three options and clearly mark the recommended one as Option 1. Format: Option 1 (Recommended): ..., Option 2: ..., Option 3: ...
4.  **AI prompts must stay in sync with the UI — always.** Whenever you make any of the following changes, you MUST also update the AI system prompts in `artifacts/api-server/src/routes/chat.ts` (Case Advisor) and `artifacts/api-server/src/routes/help-chat.ts` (Help Genie) to reflect the change:
    -   Tab name changes or tab additions/removals in the case workspace
    -   Intake step structure changes (what fields live in which step, step count, step labels)
    -   New features added to any tab (new modes, new buttons, new AI capabilities)
    -   New form types added to the Court Forms tab
    -   New tone options in the Demand Letter tab
    -   Changes to what the Hearing Prep tab offers (modes, functionality)
    -   Any workflow or process change a user might ask the AI about
    This is non-negotiable. The AI is the primary user support channel; if the prompts are stale, users get wrong guidance. Treat prompt updates as part of every UI feature task.
6.  **Stripe key rotation protocol — always run this checklist when Stripe keys change.** Whenever `STRIPE_SECRET_KEY` or `STRIPE_PUBLISHABLE_KEY` are added or replaced, immediately and proactively (without waiting for the user to report errors): (a) run `pnpm --filter @workspace/scripts exec tsx src/seed-products.ts` to create products in the new Stripe account, (b) restart the API server so StripeSync backfills the new products into the database, (c) verify the products endpoint returns the new price IDs (`price_1...GjdBAJdeVn...` pattern for this account), and (d) test the checkout endpoint directly with one of the new price IDs before declaring anything "working." The `stripe.*` database tables are read-only and managed by `stripe-replit-sync` — never attempt to DELETE or INSERT directly. The Replit connector UI will always show "Paused" and can be permanently ignored — the app uses `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` secrets directly.

5.  **UI content-fit check — always verify before coding.** Before implementing any UI change that places text or content into a constrained space (pill labels, badges, truncated containers, fixed-width elements, single-line fields), check whether the content will actually fit. If it will not fit without clipping or truncation, stop and tell the user clearly — do not silently truncate or clip. Either: (a) confirm the content fits as-is, (b) warn the user it won't fit and ask them to shorten the content, or (c) warn the user and propose a layout change to accommodate it. Never ship truncated content without flagging it first.

## System Architecture

The project is built as a pnpm monorepo. The backend is an Express 5 API server, and the frontend is a React+Vite application. Data is stored in a PostgreSQL database managed with Drizzle ORM. Validation is handled by Zod.

**UI Design Principles:**
-   **Consolidate, don't spread:** Related fields and controls should be grouped into compact, readable layouts to minimize scrolling.
-   **Size inputs to their content:** Input fields should be sized appropriately to their expected content (e.g., narrow for time, wider for notes).
-   **Prioritize what matters:** Important information and actions are placed at the top of the page/card, followed by secondary or optional fields.
-   **One line where possible:** Headers, labels, and descriptions are condensed to single lines for clarity.
-   **Users are mobile-first, non-technical:** The UI uses plain language, clear affordances, and avoids legal jargon. Buttons and actions are designed to be intuitive.

**Technical Implementations & Features:**
-   **Auth:** Clerk authentication handles user sign-in/sign-up and protects routes using JWTs.
-   **File Storage:** Documents are uploaded to Google Cloud Storage (GCS) via presigned URLs.
-   **AI Rate Limiting:** An in-memory rate limiter restricts AI calls to 30 per user per hour for `/chat`, `/demand-letter`, and `/advisor/analyze` endpoints.
-   **OCR:** OpenAI Vision API performs asynchronous OCR on uploaded documents.
-   **Chat:** Implemented with SSE streaming via raw `fetch` and `ReadableStream`.
-   **Voice:** Push-to-talk functionality uses `useVoiceRecorder` for Whisper transcription and AI integration.
-   **Demand Letter:** SSE streaming generation with PDF download.
-   **PDF Generation:**
    -   **SC-100:** Generated using Playwright + Chromium, rendering HTML/CSS with absolute positioning over base64-embedded 300 DPI PNG backgrounds for precise field placement. Coordinates are stored in `sc100-field-map.json`, derived from `pdftotext -bbox`. Uses a singleton warm-browser pool (`forms/chromium-pool.ts`) to avoid the ~2-4s Chromium cold-launch on every request — browser is pre-warmed at server start, pages are created/closed per request, browser auto-relaunches on disconnect, and shutdown drains in-flight renders for up to 5s.
    -   **MC-030:** Utilizes `pdf-lib` for form filling; includes an AI declaration auto-generation feature.
    -   **SC-105:** Uses AcroForm filling with `pdf-lib` for efficient and accurate form population. This is the preferred method for future forms.
-   **Readiness Score:** A metric (0-100) based on intake completeness (60pts), document submission (30pts), and prior demand letters (10pts).

**System Design Choices:**
-   Node.js 24, TypeScript 5.9.
-   OpenAPI spec (`openapi.yaml`) is the source of truth for all endpoints, generating React Query hooks and Zod schemas via Orval.
    -   **Codegen command:** `pnpm --filter @workspace/api-spec run codegen` (run from the workspace root).
    -   **Post-processing:** After Orval runs, `lib/api-spec/postprocess-react-query.cjs` applies two fixes automatically: (1) replaces `query?: UseQueryOptions<…>` with `query?: OptionalQueryKey<…>` in the React Query client so `queryKey` is optional at call sites, and (2) resets `lib/api-zod/src/index.ts` to export only `./generated/api` (avoiding TS2308 duplicate-export errors from Orval overwriting the barrel).
    -   **Call sites** pass `{ query: { enabled: !!id } }` without needing to supply `queryKey` — the generated helpers already provide a default.
-   The API build uses esbuild, while the frontend uses Vite.
-   Monorepo structure is enforced by pnpm workspaces and TypeScript composite projects.

## Staging vs Production Environments

This project uses Replit's two-environment model. The development workspace **is** the staging environment; the published deployment **is** production. They are fully separated — different databases, different Clerk tenants.

| | Staging (this workspace) | Production (published app) |
|---|---|---|
| **APP_ENV** | `staging` | `production` |
| **Database** | Replit dev PostgreSQL | Replit production PostgreSQL (created on first Publish) |
| **Clerk keys** | `CLERK_SECRET_KEY_DEV` + `VITE_CLERK_PUBLISHABLE_KEY_DEV` | `CLERK_SECRET_KEY` + `VITE_CLERK_PUBLISHABLE_KEY` |
| **Visible indicator** | Amber banner at top of every page | No banner |

**How key switching works:**
- Frontend (`App.tsx`): uses `import.meta.env.DEV` — true in Vite dev server (staging), false in production builds.
- API (`auth.ts`): uses `APP_ENV === "production"` — only uses the production Clerk key when deployed; staging uses dev key with prod key as fallback.
- Database: `DATABASE_URL` is runtime-managed by Replit. The dev workspace has its own DB; Replit provisions a separate production DB automatically when you first click Publish.

**Promotion workflow (staging → production):**
1. Build and test the feature in this workspace (staging).
2. Verify in the preview pane — the amber "STAGING ENVIRONMENT" banner confirms you're on staging.
3. Click **Publish** in Replit to deploy to production. Replit diffs and migrates the schema automatically.
4. Confirm the production URL has no staging banner and is working correctly.
5. Never push to GitHub automatically — always do so explicitly per user preference #1.

## External Dependencies

-   **Database:** PostgreSQL
-   **Cloud Storage:** Google Cloud Storage (GCS)
-   **Authentication:** Clerk
-   **AI Services:** OpenAI (via Replit proxy: `@workspace/integrations-openai-ai-server`, `@workspace/integrations-openai-ai-react`)
    -   OpenAI Vision API for OCR
    -   Whisper for audio transcription
    -   GPT-4o-mini for AI declaration generation
-   **PDF Libraries:**
    -   Playwright + Chromium for SC-100 generation
    -   `pdf-lib` for MC-030, SC-105, and other form manipulations
-   **Frontend UI:** Shadcn UI component library
# Small Claims Genie — Workspace

## Overview

Small Claims Genie is a California small claims court SaaS application designed to assist lower-income individuals and small businesses in navigating the CA small claims court system. It is a full-stack pnpm monorepo featuring an Express API, a React+Vite frontend, a PostgreSQL database, and integrates advanced AI capabilities including OCR, chat, and voice. The project aims to simplify legal processes, making them accessible and understandable, especially for mobile-first, non-technical users. The business vision is to offer a freemium model where users can prepare cases for free and pay to download final court forms.

## User Preferences

8.  **Never proactively mention beta limitations, spot counts, or suggest future changes.** Do not add copy like "Limited beta spots available" or similar scarcity/future-state messaging to UI unless explicitly asked. Do not suggest follow-up changes or future improvements unprompted.

1.  **GitHub — never push automatically.** Do not push to GitHub unless the user explicitly gives the instruction to do so. No automatic pushes after commits or after completing work.
2.  **Always confirm when code is live.** After finishing and deploying code changes to the running application, tell the user clearly that the changes are live. If the update requires the user to republish the app (via the Replit deploy button) to go live on the public URL, say so explicitly.
3.  **Collaboration protocol — ask questions when relevant, present options.** This is a collaboration. The user is the owner; the agent is the lead developer. When a decision point arises that requires the user's input, ask — but only if it is genuinely needed and will save rework. Do not ask unnecessary questions. When presenting choices, always offer exactly three options and clearly mark the recommended one as Option 1. Format: Option 1 (Recommended): ..., Option 2: ..., Option 3: ...

9.  **Never change existing behavior without flagging it first.** Before touching anything that already works — any UI element, AI flow, PDF/download, auth/routing logic, or on-screen copy — explicitly state what existing behavior will change and get confirmation before writing code. Pure additions (new buttons, new pages that did not exist) and content-only edits explicitly handed by the user are exempt. If a fix requires changing something else as a side effect, surface that side effect as a question first. The user and agent are too far along to go backwards fixing regressions.

7.  **Lead developer verification standards — non-negotiable before declaring anything done.**
    -   **Always self-verify before asking the user to test.** Take a screenshot of the production URL and/or run `curl -sI` to confirm headers before telling the user a fix is live. Never ask the user to test something that hasn't been verified independently first.
    -   **Visual bug reports: check auth state first.** Before treating a visual difference as a code bug, confirm whether the user is signed in or out on the affected browser. Signed-in and signed-out states intentionally render different UI — this must be ruled out before any code changes are made.
    -   **Staging vs. production: call it out proactively.** At the start of any session involving production issues, state clearly which environment each change lands in and whether a republish is required to make it live. Never leave the user to discover this themselves.
    -   **When reporting a fix, include proof.** State what was verified (e.g. `curl` output, screenshot, API response) — not just what was changed. A code change is not a fix until it is confirmed working in the target environment.
    -   **Diagnose before coding.** When something appears broken, gather evidence first (logs, screenshots, curl, auth state) before writing or changing any code. Jumping to code changes without a confirmed diagnosis wastes time and can introduce new problems.
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
-   **PDF Generation — Unified Form Engine:**
    All form download endpoints in `routes/forms-unified.ts` dispatch through `FormRegistry` (`forms/registry.ts`) using `makeFormHandler()` (`forms/generic-handler.ts`). Every form is a `FormDefinition` with a `generate(data, body, opts)` method registered at startup. There are no inline download handlers — `makeFormHandler` provides all auth, ownership, PDF streaming, and disposition logic.
    -   **Rendering technique per form** (chosen by inspecting the official Judicial Council PDF):
        1. **AcroForm via pdf-lib** (usable fields found by pdf-lib): SC-104, SC-105, SC-112A, FW-001
        2. **XFA via pdftk FDF fill** (fields found only by pdftk, not pdf-lib): SC-103, SC-103-SECONDARY, SC-120, SC-150
        3. **PNG overlay via pdf-lib drawing** (no usable fields OR dynamic content required): SC-100, SC-100A, SC-140, MC-030
    -   **SC-100:** pdf-lib AcroForm overlay (PNG background + coordinate drawing), then `pdftkFlatten`. Deterministic + AI enrichment (`enrichForSC100`, `aiEnrichForSC100`) runs inside `sc100Definition.generate()`. All three variants (basic GET, signed POST, with-overrides POST) use `makeFormHandler`; with-overrides uses `{ downloadParam: "download" }` to drive inline/attachment from `?download=1`.
    -   **SC-100A:** Overlay (XFA fields have non-descriptive positional IDs; dual-signature embedding requires image placement). Both sig bytes decoded from body inside `sc100aDefinition.generate()`.
    -   **MC-030:** Overlay with AI declaration generation and optional exhibit assembly (`routes/forms-mc030.ts`). All three variants (basic, signed, with-exhibits) route through one registry entry — `mc030Definition.generate()` inspects opts/body to pick the correct generation function. All three routes use `makeFormHandler`.
    -   **SC-140:** Overlay — no usable AcroForm fields detected by either pdf-lib or pdftk.
    -   **Chromium pool:** `forms/chromium-pool.ts` — singleton warm browser for SC-100 HTML-to-PDF rendering. Pre-warmed at server start; auto-relaunches on disconnect.
    -   **pdftk:** Used by `pdftkFlatten` to flatten XFA/AcroForm fields. Fails fast with logging on any error — no silent fallback to unfilled PDF.
-   **Readiness Score:** A metric (0-100) based on intake completeness (60pts), document submission (30pts), and prior demand letters (10pts).

**TypeScript typecheck ordering — non-negotiable:**
-   Always run `pnpm run typecheck` from the workspace root. This script runs `typecheck:libs` (`tsc --build` for composite libs) **first**, then runs `tsc --noEmit` across all leaf artifacts in the correct dependency order.
-   **Never run a leaf artifact's typecheck in isolation** (e.g. `pnpm --filter @workspace/small-claims-genie exec tsc --noEmit`) without first running `pnpm run typecheck:libs`. If `lib/api-client-react/dist/` (or any other composite lib) has stale declarations, the leaf check will silently pass or produce misleading errors.
-   The named CI validation step `typecheck` is registered and runs `pnpm run typecheck` end-to-end.

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

## SEO Roadmap

### Completed
-   **Per-page canonical tags + unique title/description via `react-helmet-async`** — Installed `react-helmet-async`, wrapped app in `<HelmetProvider>`, removed the hardcoded global canonical from `index.html`, and added unique `<Helmet>` blocks to all 11 public pages (`/`, `/pricing`, `/how-it-works`, `/types-of-cases`, `/faq`, `/resources`, `/counties`, `/startup`, `/terms`, `/copyright`, `/payment-terms`).

### Backlog
-   **Option 3 — Pre-rendering with `vite-plugin-ssg`** — Convert public marketing routes to static HTML at build time so Google's crawler receives real content on first request without needing to execute JavaScript. Best long-term SEO outcome; deferred until product is more mature and SEO is a primary growth lever. Key consideration: dynamic pages like `/counties` (which calls the API at runtime) will need special handling.
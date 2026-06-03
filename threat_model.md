# Threat Model

## Project Overview

Small Claims Genie is a California small claims court SaaS for consumers and small businesses. The production system is a public internet-facing Express 5 API (`artifacts/api-server`), a React + Vite web app (`artifacts/small-claims-genie`), an admin frontend (`artifacts/admin`), shared libraries under `lib/`, PostgreSQL via Drizzle, Clerk authentication, Google Cloud Storage for uploaded documents, Stripe for payments, and OpenAI-powered OCR/chat/voice/document drafting.

This scan is production-focused. The development workspace is staging, not production. `artifacts/mockup-sandbox` is assumed dev-only unless proven reachable in production. Replit provides TLS for deployed traffic.

## Assets

- **User accounts and sessions** — Clerk-issued tokens, user identifiers, and any bearer credentials used by web, mobile, or admin clients. Compromise enables account takeover or impersonation.
- **Case records and legal workflow data** — claimant/defendant PII, contact information, claim narratives, court details, hearing prep, generated letters, and case metadata. Exposure harms users directly and could reveal privileged or sensitive legal strategy.
- **Uploaded evidence and generated forms** — documents, OCR text, PDFs, signatures, and filing packets stored in object storage or rendered on demand. These are high-sensitivity user artifacts.
- **Payment and entitlement state** — Stripe purchase records and purchase-gated access to paid features. Tampering could unlock paid features or expose revenue data.
- **Admin data and operational views** — user lists, purchase history, analytics, signups, system status, and beta access records exposed through admin routes. Exposure would disclose business-sensitive and personal data.
- **Application secrets** — Clerk secret keys, Stripe keys, OpenAI credentials, admin API key, database credentials, and object storage signing capability. Exposure would enable broad compromise.

## Trust Boundaries

- **Public client to API** — browsers and mobile clients are untrusted. Public routes, paid-user routes, token-assisted download routes, and admin routes must all enforce server-side checks.
- **Authenticated user to other authenticated users** — numeric `caseId` and document identifiers cross a major authorization boundary. Every case-, document-, chat-, and form-related action must be scoped to the owning user on the server.
- **User to admin** — `/admin/*` functionality exposes cross-tenant operational data and must remain completely isolated from normal user capabilities.
- **API to PostgreSQL** — the API can read and mutate all core data. Broken authorization or unsafe queries at the API layer directly impact all customer records.
- **API to object storage** — the server issues upload URLs and serves private objects. Mapping between storage paths and document ownership is security-critical.
- **API to third parties** — Clerk, Stripe, OpenAI, Resend, and Google Cloud Storage are trusted external services. Requests crossing this boundary must not leak secrets or let user input drive privileged operations unsafely.
- **Production to staging/dev-only code** — staging-only behavior, mock apps, backup/source download helpers, and development fallbacks must not be reachable in production.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, `artifacts/small-claims-genie/src`, `artifacts/admin/src`, and production-facing shared clients under `lib/`.
- **Highest-risk server areas:** auth middleware, admin routes, beta/purchase gating, case/document/form download routes, storage/object access, webhook handlers, and AI routes that combine user data with external model calls.
- **Surface split:** public routes appear before `requireAuth`; some sensitive-but-pre-purchase routes exist immediately after auth (notably beta claiming, Stripe checkout/status, transcription, and signed upload URL issuance); most case/document/chat/forms routes are purchase-gated; `/admin/login` is public but `/admin/*` data routes use a separate admin bearer boundary.
- **Usually out of scope:** `artifacts/mockup-sandbox` and any route guarded by `NODE_ENV !== "production"` unless production reachability is demonstrated.

## Threat Categories

### Spoofing

The application relies on Clerk tokens for user authentication and a separate bearer secret for admin access. Production must accept only the intended production Clerk tenant tokens, and every protected route must derive identity from verified server-side credentials rather than client-controlled fields. Any public callback or webhook route must verify authenticity before trusting the caller.

### Tampering

Users can submit case data, documents, signatures, AI prompts, and payment-triggering requests. The server must enforce ownership, entitlement, and business rules server-side for every mutation and every generated artifact. Client-supplied IDs, tokenized download helpers, object paths, prices, and admin controls must never be trusted without validation against authoritative server data.

### Information Disclosure

This system stores sensitive legal and personal information, uploaded evidence, generated forms, and admin analytics. API responses, document downloads, token-based form downloads, chat exports, storage object fetches, and admin endpoints must all be scoped to the correct principal. Logs, error messages, and third-party AI requests must avoid leaking unnecessary PII or secrets.

### Denial of Service

The application exposes expensive OCR, AI generation, voice transcription, PDF rendering, and file-handling operations. Public or lightly protected endpoints must not permit unbounded request rates, oversized uploads, or repeated generation workloads that can exhaust CPU, memory, browser pools, AI quotas, or third-party limits. Timeouts and bounded processing are required where external services are invoked.

### Elevation of Privilege

The dominant risk in this codebase is broken server-side authorization: cross-case access through IDORs, misuse of download tokens, document/object retrieval that is not ownership-checked, or admin functionality reachable with ordinary user credentials. The system must ensure every case/document/form/chat operation and every admin route is authorized independently on the server, even when the caller is authenticated and even when a helper token or generated URL is presented.

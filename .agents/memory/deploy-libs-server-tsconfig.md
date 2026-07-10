---
name: Server libs must be in tsconfig.libs-server.json
description: Why a new @workspace lib imported by api-server passes local build/typecheck but fails the production publish with esbuild "Could not resolve"
---

# New server-imported workspace libs must be added to tsconfig.libs-server.json

The api-server production build (`artifacts/api-server/build.mjs`) compiles workspace
libs with `tsc --build tsconfig.libs-server.json` — a DIFFERENT file from the root
`tsconfig.json`. Only libs listed in `tsconfig.libs-server.json` (and their transitive
project references) get their `dist/index.js` emitted during a publish. esbuild then
bundles api-server and resolves each `@workspace/*` value import via its package.json
`exports` → `./dist/index.js`. If that file wasn't built, publish fails with
`Could not resolve "@workspace/<lib>"` / `The module "./dist/index.js" was not found`.

**Why it passes locally but fails on publish:** `dist/` is gitignored (not committed).
Locally the root `pnpm run typecheck` (`typecheck:libs` = `tsc --build tsconfig.json`,
which DOES list every lib) leaves a populated `dist/` on disk, so the later api-server
esbuild finds it. In a clean deploy container only `tsconfig.libs-server.json` libs get
built. A previously-shipped lib can still resolve because its `dist/` persists on the
deploy build volume from an earlier successful build — masking that it was never in the
server build graph (this is exactly how `state-facts` survived while `form-signatures`,
newly added, failed on its first publish).

**Rule:** whenever api-server gains a value import of a new `@workspace/*` lib, add
`{ "path": "./lib/<name>" }` to BOTH `tsconfig.json` AND `tsconfig.libs-server.json`.
Root typecheck alone is not enough for a deterministic publish.

**Why:** cost a full deploy-failure debug; the local/CI green + deploy-red split is
non-obvious and the volume-cache masking hides the missing entry indefinitely.

**How to apply / verify a clean build:**
`rm -rf lib/<name>/dist lib/<name>/tsconfig.tsbuildinfo tsconfig.libs-server.tsbuildinfo`
then `pnpm --filter @workspace/api-server run build` — must exit 0 and (re)create
`lib/<name>/dist/index.js`. This reproduces the deploy container's clean state.

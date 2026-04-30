/**
 * Post-processes generated files after Orval runs.
 *
 * Fix 1 – React Query client (api-client-react/src/generated/api.ts)
 *   Orval emits `query?: UseQueryOptions<…>` in its parameter signatures, and
 *   in TanStack Query v5 `UseQueryOptions` requires `queryKey`.  The generated
 *   implementation already provides a sensible default queryKey, so callers
 *   should not be forced to supply it.  We add a local helper type
 *   `OptionalQueryKey<T, E, D>` that wraps `UseQueryOptions` with queryKey
 *   optional and replace every parameter-position `query?: UseQueryOptions<`
 *   with `query?: OptionalQueryKey<`.  Return-type casts (`as UseQueryOptions<`)
 *   are left unchanged so the stricter return type is preserved.
 *
 * Fix 2 – Zod index (api-zod/src/index.ts)
 *   Orval regenerates this barrel and adds `export * from "./generated/types"`,
 *   which conflicts with the Zod schema exports in `./generated/api` (same
 *   identifiers, different kinds: TS interface vs. zod const).  We reset the
 *   barrel to export only the Zod schemas.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");

// ─── Fix 1: make queryKey optional in React Query parameter types ─────────────

const reactQueryFile = path.resolve(
  root,
  "lib",
  "api-client-react",
  "src",
  "generated",
  "api.ts",
);

let src = fs.readFileSync(reactQueryFile, "utf8");

const UTILITY_TYPE = [
  "",
  "/** Makes `queryKey` optional so callers don't have to repeat it — the",
  " *  generated `get*QueryOptions` helpers already provide a default. */",
  "type OptionalQueryKey<",
  "  TQueryFnData,",
  "  TError,",
  "  TData,",
  "> = Omit<UseQueryOptions<TQueryFnData, TError, TData>, \"queryKey\"> & {",
  "  queryKey?: QueryKey;",
  "};",
  "",
].join("\n");

const ANCHOR =
  'import { customFetch } from "../custom-fetch";\n' +
  'import type { ErrorType, BodyType } from "../custom-fetch";';

if (!src.includes(ANCHOR)) {
  console.error(
    "[postprocess] Could not find anchor for utility type insertion. " +
      "The generated file format may have changed.",
  );
  process.exit(1);
}

if (!src.includes("OptionalQueryKey")) {
  src = src.replace(ANCHOR, ANCHOR + "\n" + UTILITY_TYPE);
}

const PARAM_PATTERN = /query\?: UseQueryOptions</g;
const REPLACEMENT = "query?: OptionalQueryKey<";

const before = (src.match(PARAM_PATTERN) || []).length;
src = src.replace(PARAM_PATTERN, REPLACEMENT);
const after = (src.match(/query\?: OptionalQueryKey</g) || []).length;

if (before === 0) {
  console.warn(
    "[postprocess] No `query?: UseQueryOptions<` patterns found — " +
      "the generated file may have changed structure.",
  );
} else {
  console.log(
    `[postprocess] Replaced ${after}/${before} query parameter type(s) with OptionalQueryKey.`,
  );
}

fs.writeFileSync(reactQueryFile, src, "utf8");
console.log("[postprocess] Fix 1 done →", reactQueryFile);

// ─── Fix 2: reset api-zod barrel to avoid duplicate-export TS errors ─────────

const zodIndexFile = path.resolve(root, "lib", "api-zod", "src", "index.ts");
const CORRECT_ZOD_INDEX = 'export * from "./generated/api";\n';

const currentZodIndex = fs.readFileSync(zodIndexFile, "utf8");
if (currentZodIndex !== CORRECT_ZOD_INDEX) {
  fs.writeFileSync(zodIndexFile, CORRECT_ZOD_INDEX, "utf8");
  console.log("[postprocess] Fix 2 done — reset Zod barrel →", zodIndexFile);
} else {
  console.log("[postprocess] Fix 2 — Zod barrel already correct, no change.");
}

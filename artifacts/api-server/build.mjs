import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, stat } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(artifactDir, "../..");

// The banner shim lets CJS-style `require()` calls work inside ESM output
// files. It is appended to every output file (main bundle, workers, and shared
// chunks) so that dynamic require()s from bundled CJS modules don't throw.
const esmCjsShim = `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `;

async function buildAll() {
  const tscBin = path.resolve(rootDir, "node_modules/.bin/tsc");
  console.log("Building workspace libs with tsc --build...");
  execFileSync(tscBin, ["--build", path.resolve(rootDir, "tsconfig.libs-server.json")], {
    stdio: "inherit",
    cwd: rootDir,
  });
  console.log("Workspace libs built successfully.");
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // splitting: true extracts code shared between the main bundle and the
    // pino worker entry points (added by esbuildPluginPino) into shared
    // chunks. This prevents each worker from bundling its own copy of pino's
    // transitive deps (sonic-boom, on-exit-leak-free, etc.), keeping worker
    // files at ~56 KB rather than ~150 KB each.
    splitting: true,
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      // ── Heavy direct dependencies of @workspace/api-server ───────────────────
      // Externalizing these cuts the bundle from ~17 MB to a few hundred KB.
      // They are declared in package.json so pnpm guarantees they are accessible
      // from node_modules at runtime.
      "@clerk/express",
      "@clerk/*",
      "@react-pdf/renderer",
      "@react-pdf/*",
      "react",
      "react/*",
      "react-dom",
      "react-dom/*",
      "drizzle-orm",
      "drizzle-orm/*",
      "express",
      "express/*",
      "cors",
      "cookie-parser",
      "multer",
      "multer/*",
      "docx",
      "mammoth",
      "mammoth/*",
      "pdf-lib",
      "pdf-lib/*",
      "pdf-parse",
      "resend",
      "resend/*",
      "google-auth-library",
      "google-auth-library/*",
      "pino-http",
      "openai",
      "openai/*",
      "zod",
      "zod/*",
      // ── Native / unbundleable packages ──────────────────────────────────────
      "*.node",
      "@napi-rs/canvas",
      "pdfjs-dist",
      "pdfjs-dist/*",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "playwright-core",
      "playwright-core/*",
      "chromium-bidi",
      "chromium-bidi/*",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: false,
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled
    // continue to work in our esm output file. Applied to all output files
    // (main bundle, worker entries, and shared chunks) so require() always works.
    banner: {
      js: esmCjsShim,
    },
  });

  // ── Pino worker size guard ───────────────────────────────────────────────────
  // Task #13 fixed these workers bloating from ~56 KB to ~150 KB each when
  // packages were erroneously externalized (causing each worker to re-bundle
  // pino's transitive deps). The threshold below is set generously above the
  // healthy baseline (pino-pretty ~90 KB, others <10 KB) so that innocent
  // growth doesn't trigger a false alarm, while still catching a regression
  // back to ~150 KB territory.
  const WORKER_SIZE_LIMIT_BYTES = 100 * 1024; // 100 KB
  const workerFiles = ["pino-worker.mjs", "pino-file.mjs", "pino-pretty.mjs"];
  const oversized = [];
  for (const filename of workerFiles) {
    const filePath = path.resolve(distDir, filename);
    try {
      const { size } = await stat(filePath);
      const kb = (size / 1024).toFixed(1);
      console.log(`  ${filename}: ${kb} KB`);
      if (size > WORKER_SIZE_LIMIT_BYTES) {
        oversized.push({ filename, size });
      }
    } catch (err) {
      // File not emitted (e.g. pino-pretty not used) — skip silently.
      if (err.code !== "ENOENT") throw err;
    }
  }
  if (oversized.length > 0) {
    const lines = oversized.map(
      ({ filename, size }) =>
        `  ${filename}: ${(size / 1024).toFixed(1)} KB (limit: ${WORKER_SIZE_LIMIT_BYTES / 1024} KB)`
    );
    console.error(
      "\nBuild failed: pino worker bundle(s) exceed the size limit.\n" +
        "This usually means packages were externalized that the workers need bundled.\n" +
        "Check the 'external' list in build.mjs and ensure pino's transitive deps\n" +
        "are NOT externalized (they should be inlined via code-splitting).\n\n" +
        lines.join("\n")
    );
    process.exit(1);
  }
  console.log("Pino worker size check passed.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

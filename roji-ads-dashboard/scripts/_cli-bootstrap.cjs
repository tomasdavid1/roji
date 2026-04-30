/**
 * CLI bootstrap that:
 *   1. Loads `.env.local` so `process.env.GOOGLE_ADS_*` is populated
 *      before any module reads it. Without this the provisioner falls
 *      back to mock mode (REQUIRED_ENV check fails) and writes nothing.
 *   2. Aliases `server-only` to a no-op before any user code runs.
 *      Without this, Node loads the real `server-only` package, which
 *      is hard-coded to throw on import (it relies on Next.js to
 *      intercept the import in production builds).
 *
 * Used by scripts/provision-blueprint.ts via `node --require ... --import tsx`.
 */
const Module = require("module");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env.local"),
});

const SHIM_PATH = path.resolve(__dirname, "server-only-shim.cjs");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === "server-only") {
    return SHIM_PATH;
  }
  return originalResolve.call(this, request, ...rest);
};

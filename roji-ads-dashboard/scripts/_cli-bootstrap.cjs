/**
 * CLI bootstrap that aliases `server-only` to a no-op before any user
 * code runs. Without this, Node loads the real `server-only` package,
 * which is hard-coded to throw on import (it relies on Next.js to
 * intercept the import in production builds).
 *
 * Used by scripts/provision-blueprint.ts via `tsx --import`.
 */
const Module = require("module");
const path = require("path");

const SHIM_PATH = path.resolve(__dirname, "server-only-shim.cjs");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patched(request, ...rest) {
  if (request === "server-only") {
    return SHIM_PATH;
  }
  return originalResolve.call(this, request, ...rest);
};

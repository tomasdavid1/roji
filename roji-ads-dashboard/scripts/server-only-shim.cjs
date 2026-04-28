// no-op replacement for the `server-only` package, used by the CLI
// blueprint provisioner so we can import the same modules Next imports
// in production without `server-only` throwing. The actual code only
// hits this shim when running outside of Next (the CLI sets up a
// require alias before importing the lib modules).
module.exports = {};

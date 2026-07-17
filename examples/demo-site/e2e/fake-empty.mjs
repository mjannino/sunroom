// Stands in for the "server-only" marker package, whose real module body
// unconditionally throws when required outside a bundler's server graph.
// Next's webpack config special-cases it at build time; this loader
// (node-loader.mjs) does the equivalent for a plain Node process.
export {};

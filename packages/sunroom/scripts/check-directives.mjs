// Content-agnostic directive check for the built `dist/*.js` chunks.
//
// This does NOT look for any specific identifier (no "SmokeCounter", no
// "smokeAction" — those were smoke-test artifacts from the build spike and
// are gone). Instead it inspects every emitted chunk generically for two
// real failure modes of `@hyperse/esbuild-plugin-preserve-directives`
// hoisting directives incorrectly:
//
//   1. A chunk contains BOTH a `"use client"` and a `"use server"` directive
//      string anywhere in its body. Next's compiler hard-errors on this
//      ("It's not possible to have both `use client` and `use server`
//      directives in the same file") — this is exactly what the Phase 5
//      Slice 1 build spike hit with a single tsup entry (see
//      .superpowers/sdd/task-1-report.md).
//   2. A chunk contains a directive string that isn't actually in directive
//      position — neither the first statement of the file (line 1, after
//      trimming) nor the first statement of a function body (the classic
//      per-function inline `'use server'` form used for Server Actions,
//      e.g. `async function save(x) { 'use server'; ... }`). A directive
//      in neither position is inert/misplaced — a sign it was hoisted to
//      the wrong place or otherwise mangled. Based on the actual emitted
//      shape (see the build spike report and Task 4), the plugin/tsup
//      emits the directive either as the literal first line of the chunk
//      (module-level directive) or as the first line inside a function's
//      `{ ... }` block (inline per-function directive) — both count as
//      valid placement.
//
// Only Node builtins are used so this can run standalone in CI with no
// dependency install beyond the workspace build.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const files = readdirSync(dist).filter((f) => f.endsWith(".js"));

const DIRECTIVES = ["use client", "use server"];

// Does `body` contain the directive as a quoted string literal anywhere,
// single- or double-quoted (e.g. `"use client"` or `'use client'`)?
function containsDirective(body, directive) {
  return body.includes(`"${directive}"`) || body.includes(`'${directive}'`);
}

// Is `line` (once trimmed, with an optional trailing semicolon stripped)
// exactly the directive statement, in either quote style?
function isDirectiveLine(line, directive) {
  const trimmed = line.trim().replace(/;$/, "");
  return trimmed === `"${directive}"` || trimmed === `'${directive}'`;
}

let failed = false;

for (const f of files) {
  const body = readFileSync(join(dist, f), "utf8");
  const lines = body.split("\n");
  const firstLine = lines[0] ?? "";
  const present = Object.fromEntries(
    DIRECTIVES.map((d) => [d, containsDirective(body, d)]),
  );

  if (present["use client"] && present["use server"]) {
    console.error(
      `FAIL: ${f} contains both a "use client" and a "use server" directive ` +
        `in the same chunk — Next rejects this. Give client and server code ` +
        `separate tsup entries/chunks.`,
    );
    failed = true;
  }

  for (const directive of DIRECTIVES) {
    if (!present[directive]) continue;

    // Find every line that is exactly the directive statement, and confirm
    // each one is in valid directive position: line 1 of the file, or the
    // first statement inside a function body (previous non-blank line ends
    // with `{`).
    for (let i = 0; i < lines.length; i++) {
      if (!isDirectiveLine(lines[i], directive)) continue;

      if (i === 0) continue; // module-level directive

      let prev = i - 1;
      while (prev >= 0 && lines[prev].trim() === "") prev--;
      const prevTrimmed = prev >= 0 ? lines[prev].trim() : "";
      if (prevTrimmed.endsWith("{")) continue; // inline per-function directive

      console.error(
        `FAIL: ${f} contains a "${directive}" directive string at line ${i + 1} ` +
          `that is neither on line 1 nor the first statement of a function ` +
          `body (preceding line: ${JSON.stringify(lines[prev] ?? "")}) — the ` +
          `directive is misplaced/inert and will not be honored.`,
      );
      failed = true;
    }
  }
}

console.log(failed ? "directive check: FAIL" : "directive check: OK");
process.exit(failed ? 1 : 0);

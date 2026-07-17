import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname;
const files = readdirSync(dist).filter((f) => f.endsWith(".js"));

let failed = false;
const firstLine = (f) =>
  readFileSync(join(dist, f), "utf8").split("\n", 1)[0].trim();

// Any chunk containing SmokeCounter must be a client chunk (directive on line 1).
for (const f of files) {
  const body = readFileSync(join(dist, f), "utf8");
  if (
    body.includes("SmokeCounter") &&
    firstLine(f) !== '"use client";' &&
    firstLine(f) !== "'use client';"
  ) {
    console.error(
      `FAIL: ${f} contains a client component but line 1 is not a use-client directive`,
    );
    failed = true;
  }
  if (
    body.includes("smokeAction") &&
    !firstLine(f).includes("use server") &&
    !body.includes('"use server"')
  ) {
    console.error(
      `FAIL: ${f} contains the server action but no use-server directive`,
    );
    failed = true;
  }
}
console.log(failed ? "directive check: FAIL" : "directive check: OK");
process.exit(failed ? 1 : 0);

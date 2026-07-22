import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMailtoHref } from "./mailto.ts";

test("builds a mailto with encoded subject and body", () => {
  const href = buildMailtoHref("booking@studio.example", {
    name: "Ada Vane",
    email: "ada@band.example",
    project: "Slow Weather",
    musicLink: "https://band.example",
    songCount: "EP",
    timing: "this fall",
    message: "We want it loud & warm.",
  });
  assert.ok(href.startsWith("mailto:booking@studio.example?"));
  const q = new URLSearchParams(href.slice(href.indexOf("?") + 1));
  assert.equal(q.get("subject"), "New inquiry — Slow Weather");
  const body = q.get("body") ?? "";
  assert.ok(body.includes("Name: Ada Vane"));
  assert.ok(body.includes("Email: ada@band.example"));
  assert.ok(body.includes("Band / project: Slow Weather"));
  assert.ok(body.includes("We want it loud & warm."));
});

test("omits empty optional fields from the body", () => {
  const href = buildMailtoHref("b@s.example", {
    name: "Kit",
    email: "kit@x.example",
    project: "Untitled",
  });
  const q = new URLSearchParams(href.slice(href.indexOf("?") + 1));
  const body = q.get("body") ?? "";
  assert.ok(!body.includes("Music link:"));
  assert.ok(!body.includes("Songs:"));
  assert.ok(!body.includes("Timing:"));
  assert.equal(body, "Name: Kit\nEmail: kit@x.example\nBand / project: Untitled");
});

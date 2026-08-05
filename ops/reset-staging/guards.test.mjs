import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertStagingTarget,
  STAGING_BUCKET,
  STAGING_HOST,
} from "./guards.mjs";

test("passes for the exact staging bucket and host", () => {
  assert.doesNotThrow(() =>
    assertStagingTarget({ bucket: STAGING_BUCKET, host: STAGING_HOST }),
  );
});

test("refuses a non-staging bucket", () => {
  assert.throws(
    () => assertStagingTarget({ bucket: "sunroom-prod", host: STAGING_HOST }),
    /is not the staging bucket/,
  );
});

test("refuses a non-staging host", () => {
  assert.throws(
    () =>
      assertStagingTarget({ bucket: STAGING_BUCKET, host: "evil.example.com" }),
    /is not the staging host/,
  );
});

test("refuses an undefined bucket", () => {
  assert.throws(
    () => assertStagingTarget({ bucket: undefined, host: STAGING_HOST }),
    /is not the staging bucket/,
  );
});

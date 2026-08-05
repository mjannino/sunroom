import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteAllObjects } from "./wipe-bucket.mjs";

// Fake S3 client: yields queued list pages, records delete batches. Uses the
// real command classes' shape (`constructor.name`, `.input`) so it exercises
// exactly what deleteAllObjects builds.
function fakeClient(pages) {
  const deleteBatches = [];
  let i = 0;
  return {
    deleteBatches,
    async send(command) {
      const name = command.constructor.name;
      if (name === "ListObjectsV2Command") return pages[i++];
      if (name === "DeleteObjectsCommand") {
        deleteBatches.push(command.input.Delete.Objects.map((o) => o.Key));
        return {};
      }
      throw new Error(`unexpected command ${name}`);
    },
  };
}

test("deletes objects across paginated list pages", async () => {
  const client = fakeClient([
    {
      Contents: [{ Key: "a" }, { Key: "b" }],
      IsTruncated: true,
      NextContinuationToken: "t1",
    },
    { Contents: [{ Key: "c" }], IsTruncated: false },
  ]);
  const deleted = await deleteAllObjects(client, "sunroom-staging");
  assert.equal(deleted, 3);
  assert.deepEqual(client.deleteBatches, [["a", "b"], ["c"]]);
});

test("makes no delete call for an already-empty bucket", async () => {
  const client = fakeClient([{ Contents: [], IsTruncated: false }]);
  const deleted = await deleteAllObjects(client, "sunroom-staging");
  assert.equal(deleted, 0);
  assert.deepEqual(client.deleteBatches, []);
});

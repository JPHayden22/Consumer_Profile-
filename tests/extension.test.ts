import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const manifest = JSON.parse(fs.readFileSync("extension/manifest.json", "utf8"));
test("permission is optional and credentials permissions absent", () => {
  assert.deepEqual(manifest.optional_permissions, ["history"]);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.manifest_version, 3);
  assert.equal(JSON.stringify(manifest).includes("<all_urls>"), false);
});
test("bridge authorization, date range, sanitization, and revoke", async () => {
  let listener: any,
    removed = false;
  const chrome = {
    runtime: {
      id: "test",
      onMessage: { addListener: (fn: any) => (listener = fn) },
    },
    permissions: {
      contains: async () => true,
      remove: async () => {
        removed = true;
      },
    },
    history: {
      search: async () => [
        { url: "https://example.com/laptop?secret=x", title: "laptop" },
      ],
      getVisits: async () => [{ visitTime: Date.now() }, { visitTime: 1 }],
    },
  };
  vm.runInNewContext(fs.readFileSync("extension/background.js", "utf8"), {
    chrome,
    URL,
    Date,
    Error,
  });
  const call = (message: any, url: string) =>
    new Promise<any>((resolve) =>
      listener(message, { id: "test", url }, resolve),
    );
  assert.match(
    (
      await call(
        { type: "history", days: 7 },
        "https://evil.example/Consumer_Profile-/",
      )
    ).error,
    /Unauthorized/,
  );
  assert.match(
    (
      await call(
        { type: "history", days: 1 },
        "https://jphayden22.github.io/Consumer_Profile-/",
      )
    ).error,
    /Invalid/,
  );
  const result = await call(
    { type: "history", days: 7 },
    "https://jphayden22.github.io/Consumer_Profile-/",
  );
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].url, "https://example.com/laptop");
  await call(
    { type: "revoke" },
    "https://jphayden22.github.io/Consumer_Profile-/",
  );
  assert.equal(removed, true);
});

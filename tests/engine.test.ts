import test from "node:test";
import assert from "node:assert/strict";
import {
  parseImport,
  analyze,
  recommendations,
  safeUrl,
} from "../src/engine.ts";
test("URL privacy and unsafe protocols", () => {
  assert.equal(
    safeUrl("https://example.com/p?token=secret#private"),
    "https://example.com/p",
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://a:b@example.com"), "");
});
test("Takeout microsecond timestamps and unknown records", () => {
  const x = parseImport(
    JSON.stringify({
      "Browser History": [
        {
          url: "https://example.com",
          title: "laptop",
          time_usec: 1700000000000000,
        },
        { url: "bad" },
      ],
    }),
    "takeout.json",
  );
  assert.equal(x.records.length, 1);
  assert.equal(x.records[0].time, 1700000000000);
  assert.equal(x.skipped, 1);
});
test("CSV supports quoted commas", () => {
  const x = parseImport(
    'url,title,time\nhttps://example.com,"laptop, review",2024-01-01',
    "history.csv",
  );
  assert.equal(x.records[0].title, "laptop, review");
});
test("assistant and quoted material excluded", () => {
  const x = parseImport(
    JSON.stringify([
      {
        mapping: {
          a: {
            message: {
              author: { role: "assistant" },
              content: { parts: ["laptop"] },
            },
          },
          b: {
            message: {
              author: { role: "user" },
              content: { parts: ['I like hiking\n> laptop review\n"gaming"'] },
              create_time: 1700000000,
            },
          },
        },
      },
    ]),
    "conversations.json",
  );
  assert.equal(x.records.length, 1);
  assert.equal(x.records[0].title.includes("laptop"), false);
  assert.equal(x.records[0].title.includes("gaming"), false);
  assert.equal(analyze(x.records).interests[0].name, "Outdoors");
});
test("sensitive topics excluded and no weak recommendation", () => {
  const x = parseImport(
    JSON.stringify([
      { url: "https://example.com", title: "medical laptop" },
      { url: "https://example.com", title: "laptop" },
    ]),
    "history.json",
  );
  const a = analyze(x.records);
  assert.equal(a.excluded, 1);
  assert.equal(a.interests[0].evidence.length, 1);
  assert.equal(a.tendencies[0].score, null);
  assert.equal(
    recommendations(
      [
        {
          name: "Real supplied item",
          url: "https://example.com/item",
          category: "Technology",
        },
      ],
      a,
    ).length,
    0,
  );
});
test("feedback removes inaccurate category recommendations", () => {
  const x = parseImport(
    JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({
        url: `https://example.com/${i}`,
        title: "laptop review",
      })),
    ),
    "history.json",
  );
  const p = [
    {
      name: "Catalog item",
      url: "https://example.com/item",
      category: "Technology",
    },
  ];
  assert.equal(recommendations(p, analyze(x.records)).length, 1);
  assert.equal(
    recommendations(p, analyze(x.records, { Technology: "inaccurate" })).length,
    0,
  );
});
test("empty state has no invented profile", () => {
  assert.equal(analyze([]).interests.length, 0);
  assert.equal(analyze([]).sites.length, 0);
});

test("numeric CSV timestamps preserve seconds and milliseconds", () => {
  assert.equal(
    parseImport(
      "url,title,time\nhttps://example.com,laptop,1700000000",
      "history.csv",
    ).records[0].time,
    1700000000000,
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { graphModel, detectCommunities } from "../src/graph-model.ts";
import { RecordItem } from "../src/engine.ts";
test("weighted communities preserve disconnected components and are deterministic", () => {
  const nodes = ["a", "b", "c", "d"].map((id) => ({ id }));
  const links = [
    { source: "a", target: "b", value: 4 },
    { source: "c", target: "d", value: 2 },
  ];
  const result = detectCommunities(nodes, links);
  assert.equal(result.get("a"), result.get("b"));
  assert.equal(result.get("c"), result.get("d"));
  assert.notEqual(result.get("a"), result.get("c"));
  assert.deepEqual(result, detectCommunities(nodes, links));
});
test("graph bounds domain nodes for large supplied datasets", () => {
  const rows: RecordItem[] = Array.from({ length: 30000 }, (_, i) => ({
    id: String(i),
    url: `https://site${i % 100}.example/laptop`,
    title: "laptop review",
    time: 1700000000000,
    source: "UNIT TEST FIXTURE",
    kind: "visit",
  }));
  const model = graphModel(rows);
  assert.equal(model.nodes.filter((n) => n.type === "website").length, 50);
  assert.equal(model.links.length, 50);
  assert.equal(
    model.nodes.find((n) => n.type === "category")?.evidence.length,
    30000,
  );
});
test("real catalog relations and known brand nodes use evidence", () => {
  const rows: RecordItem[] = [
    {
      id: "1",
      url: "https://www.apple.com/laptop",
      title: "laptop - Google Search",
      time: null,
      source: "UNIT TEST FIXTURE",
      kind: "visit",
    },
  ];
  const result = graphModel(rows, [
    {
      name: "Supplied catalog item",
      url: "https://example.com/item",
      category: "Technology",
    },
  ]);
  assert.equal(result.nodes.find((n) => n.type === "brand")?.label, "Apple");
  assert.equal(result.nodes.filter((n) => n.type === "search").length, 1);
  assert.equal(result.nodes.filter((n) => n.type === "product").length, 1);
  assert.equal(graphModel([]).nodes.length, 0);
});

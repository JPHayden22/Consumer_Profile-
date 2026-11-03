import { analyze, domain, sensitive, RecordItem, Product } from "./engine";
export type GraphNode = {
  id: string;
  label: string;
  type: string;
  group: number;
  size: number;
  evidence: RecordItem[];
};
export type GraphLink = { source: string; target: string; value: number };
const brands: Record<string, string> = {
  "apple.com": "Apple",
  "nike.com": "Nike",
  "patagonia.com": "Patagonia",
  "ikea.com": "IKEA",
  "sony.com": "Sony",
  "samsung.com": "Samsung",
  "nintendo.com": "Nintendo",
  "adidas.com": "Adidas",
};
export function graphModel(
  records: RecordItem[],
  products: Product[] = [],
  mode = "categories",
) {
  const a = analyze(records),
    nodes: GraphNode[] = [],
    links: GraphLink[] = [];
  const displayedSites = a.sites.slice(0, 50);
  const membership = new Map(
    a.interests.map((c) => [c.name, new Set(c.evidence.map((r) => r.id))]),
  );
  for (const [group, c] of a.interests.slice(0, 12).entries()) {
    nodes.push({
      id: "category:" + c.name,
      label: c.name,
      type: "category",
      group,
      size: Math.min(45, 24 + Math.sqrt(c.evidence.length) * 2),
      evidence: c.evidence,
    });
    const ids = membership.get(c.name)!;
    for (const s of displayedSites) {
      const count = s.evidence.reduce((n, r) => n + Number(ids.has(r.id)), 0);
      if (count)
        links.push({
          source: "category:" + c.name,
          target: "domain:" + s.name,
          value: count,
        });
    }
  }
  for (const s of displayedSites) {
    const group = Math.max(
      0,
      a.interests.findIndex((c) =>
        s.evidence.some((r) => membership.get(c.name)!.has(r.id)),
      ),
    );
    nodes.push({
      id: "domain:" + s.name,
      label: s.name,
      type: "website",
      group,
      size: Math.min(28, 6 + Math.sqrt(s.evidence.length) * 3),
      evidence: s.evidence,
    });
    const host = Object.keys(brands).find(
      (host) => s.name === host || s.name.endsWith("." + host),
    );
    if (host) {
      const id = "brand:" + brands[host];
      const existing = nodes.find((n) => n.id === id);
      if (existing) existing.evidence.push(...s.evidence);
      else
        nodes.push({
          id,
          label: brands[host],
          type: "brand",
          group,
          size: 18,
          evidence: [...s.evidence],
        });
      links.push({
        source: id,
        target: "domain:" + s.name,
        value: s.evidence.length,
      });
    }
  }
  for (const [i, product] of products.slice(0, 20).entries()) {
    const category = a.interests.find(
      (c) => c.name.toLowerCase() === product.category.toLowerCase(),
    );
    if (!category) continue;
    const group = a.interests.indexOf(category);
    nodes.push({
      id: "product:" + i,
      label: product.name.slice(0, 55),
      type: "product",
      group,
      size: 12,
      evidence: category.evidence,
    });
    links.push({
      source: "product:" + i,
      target: "category:" + category.name,
      value: Math.max(1, category.evidence.length),
    });
  }
  const searches = new Map<string, RecordItem[]>();
  for (const r of records) {
    const match = r.title.match(/^(.*?)\s+[–-]\s+(?:Google|Bing) Search$/i);
    if (match && !sensitive.test(r.title)) {
      const term = match[1].slice(0, 70);
      searches.set(term, [...(searches.get(term) || []), r]);
    }
  }
  for (const [term, evidence] of [...searches]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)) {
    const id = "search:" + term;
    const related = a.interests.filter((c) =>
      evidence.some((r) => membership.get(c.name)!.has(r.id)),
    );
    if (!related.length) continue;
    nodes.push({
      id,
      label: term,
      type: "search",
      group: a.interests.indexOf(related[0]),
      size: 10,
      evidence,
    });
    for (const c of related)
      links.push({
        source: id,
        target: "category:" + c.name,
        value: evidence.filter((r) => membership.get(c.name)!.has(r.id)).length,
      });
  }
  if (mode === "communities") {
    const groups = detectCommunities(nodes, links);
    for (const n of nodes) n.group = groups.get(n.id)!;
  }
  return { nodes, links };
}
// Deterministic weighted label propagation. Communities describe graph topology, never personal traits.
export function detectCommunities(
  nodes: Pick<GraphNode, "id">[],
  links: GraphLink[],
) {
  const adjacency = new Map(
    nodes.map((n) => [n.id, [] as { id: string; weight: number }[]]),
  );
  for (const l of links) {
    adjacency.get(l.source)?.push({ id: l.target, weight: l.value });
    adjacency.get(l.target)?.push({ id: l.source, weight: l.value });
  }
  const labels = new Map(nodes.map((n) => [n.id, n.id]));
  const order = [...nodes].sort(
    (a, b) =>
      (adjacency.get(b.id)?.length || 0) - (adjacency.get(a.id)?.length || 0) ||
      a.id.localeCompare(b.id),
  );
  for (let iteration = 0; iteration < 20; iteration++) {
    let changed = false;
    for (const n of order) {
      const votes = new Map<string, number>();
      for (const edge of adjacency.get(n.id) || []) {
        const label = labels.get(edge.id)!;
        votes.set(label, (votes.get(label) || 0) + edge.weight);
      }
      if (!votes.size) continue;
      const ranked = [...votes].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      const current = labels.get(n.id)!;
      const winner =
        votes.get(current) === ranked[0][1] ? current : ranked[0][0];
      if (winner !== current) {
        labels.set(n.id, winner);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const unique = [...new Set(labels.values())].sort();
  return new Map([...labels].map(([id, label]) => [id, unique.indexOf(label)]));
}

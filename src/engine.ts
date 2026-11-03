import Papa from "papaparse";
export type RecordItem = {
  id: string;
  url: string;
  title: string;
  time: number | null;
  source: string;
  kind: "visit" | "statement" | "order";
};
export type Product = {
  name: string;
  url: string;
  category: string;
  price?: number;
  currency?: string;
  verifiedAt?: string;
};
export const categories: Record<string, string[]> = {
  Technology: [
    "laptop",
    "computer",
    "camera",
    "headphone",
    "software",
    "keyboard",
    "electronics",
  ],
  Design: ["design", "architecture", "furniture", "interior", "typography"],
  Outdoors: ["camping", "hiking", "outdoor", "cycling", "bicycle"],
  Fashion: ["clothing", "sneaker", "fashion", "apparel", "shoes"],
  Home: ["kitchen", "garden", "home", "cookware"],
  Entertainment: ["gaming", "game", "music", "movie", "streaming"],
  Travel: ["flight", "hotel", "travel", "luggage"],
  Fitness: ["running", "fitness", "workout", "sports"],
};
export const sensitive =
  /\b(cancer|diabetes|therapy|medical|health|religion|church|mosque|politic|election|democrat|republican|sexual|gay|lesbian|pregnan|prescription|mental)\w*/i;
export function safeUrl(value: unknown) {
  try {
    const u = new URL(String(value));
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return "";
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    return "";
  }
}
export function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "User statement";
  }
}
const categoryPatterns = Object.entries(categories).map(
  ([name, words]) =>
    [name, new RegExp("\\b(?:" + words.join("|") + ")\\b", "i")] as const,
);
export function classify(r: RecordItem) {
  const text = (r.title + " " + r.url).toLowerCase();
  if (sensitive.test(text)) return [];
  return categoryPatterns
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
}
export const shopping = (r: RecordItem) =>
  [
    "amazon.com",
    "walmart.com",
    "target.com",
    "bestbuy.com",
    "etsy.com",
    "ebay.com",
  ].some(
    (host) => domain(r.url) === host || domain(r.url).endsWith("." + host),
  ) || /\b(price|buy|shop|sale|order|review|compare)\b/i.test(r.title);
function timestamp(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v)) v = Number(v);
  let n = typeof v === "number" ? v : Date.parse(String(v));
  if (typeof v === "number" && v > 1e14) n = v / 1000;
  if (typeof v === "number" && v < 1e11) n = v * 1000;
  return Number.isFinite(n) && n > 0 && n <= Date.now() + 86400000 ? n : null;
}
export function parseImport(
  text: string,
  name: string,
): { records: RecordItem[]; products: Product[]; skipped: number } {
  const data = name.toLowerCase().endsWith(".csv")
    ? Papa.parse(text, { header: true, skipEmptyLines: true }).data
    : JSON.parse(text);
  let rows: any[] = [];
  if (Array.isArray(data)) rows = data;
  else if (Array.isArray(data["Browser History"]))
    rows = data["Browser History"];
  else if (Array.isArray(data.history)) rows = data.history;
  else if (Array.isArray(data.products)) rows = data.products;
  else
    throw Error(
      "Unsupported structure. Use a JSON array, Browser History, history, products, or CSV headers.",
    );
  const records: RecordItem[] = [],
    products: Product[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      skipped++;
      continue;
    }
    if (row.mapping) {
      for (const node of Object.values(row.mapping) as any[]) {
        const m = node?.message;
        if (m?.author?.role !== "user") continue;
        const raw = (m.content?.parts || [])
          .filter((v: any) => typeof v === "string")
          .join(" ");
        const title = raw
          .split("\n")
          .filter((l: string) => !/^\s*>/.test(l))
          .join(" ")
          .replace(/"[^"\n]*"|“[^”]*”/g, "")
          .slice(0, 2000);
        if (title.trim())
          records.push({
            id: crypto.randomUUID(),
            url: "",
            title,
            time: timestamp(m.create_time),
            source: name,
            kind: "statement",
          });
      }
      continue;
    }
    const url = safeUrl(row.url || row.titleUrl || row.product_url);
    const title = String(row.title || row.name || row.product_name || "").slice(
      0,
      2000,
    );
    if (row.category && (row.name || row.product_name) && url) {
      const price = Number(row.price);
      products.push({
        name: title,
        url,
        category: String(row.category),
        ...(Number.isFinite(price) && price >= 0 && row.verifiedAt
          ? {
              price,
              currency: String(row.currency || "USD"),
              verifiedAt: String(row.verifiedAt),
            }
          : {}),
      });
      continue;
    }
    if (!url) {
      skipped++;
      continue;
    }
    records.push({
      id: crypto.randomUUID(),
      url,
      title,
      time: timestamp(
        row.time ||
          row.lastVisitTime ||
          row.time_usec ||
          row.timestamp ||
          row.date,
      ),
      source: name,
      kind: row.kind === "order" ? "order" : "visit",
    });
  }
  return { records, products, skipped };
}
export function analyze(
  records: RecordItem[],
  feedback: Record<string, string> = {},
) {
  const counts = new Map<string, RecordItem[]>(),
    sites = new Map<string, RecordItem[]>();
  for (const r of records) {
    if (r.url) {
      const d = domain(r.url);
      if (!sites.has(d)) sites.set(d, []);
      sites.get(d)!.push(r);
    }
    for (const c of classify(r)) {
      if (!counts.has(c)) counts.set(c, []);
      counts.get(c)!.push(r);
    }
  }
  const interests = [...counts]
    .map(([name, evidence]) => ({
      name,
      evidence,
      score: Math.round((evidence.length / Math.max(records.length, 1)) * 100),
      feedback: feedback[name] || "unreviewed",
    }))
    .sort((a, b) => b.evidence.length - a.evidence.length);
  const rankedSites = [...sites]
    .map(([name, evidence]) => ({ name, evidence }))
    .sort((a, b) => b.evidence.length - a.evidence.length);
  const dated = records.filter((r) => r.time !== null);
  const shop = records.filter(shopping);
  const compare = shop.filter((r) =>
    /\b(compare|versus|vs|price|deal|discount)\b/i.test(r.title),
  );
  const research = shop.filter((r) =>
    /\b(review|specification|specs|comparison)\b/i.test(r.title),
  );
  const tendencies = [
    {
      name: "Research intensity",
      evidence: research,
      base: shop,
      method:
        "Shopping records with review, specs, specification, or comparison in their title.",
    },
    {
      name: "Price comparison signals",
      evidence: compare,
      base: shop,
      method:
        "Shopping records mentioning compare, price, deal, discount, versus, or vs. This does not establish price sensitivity.",
    },
    {
      name: "Repeat browsing",
      evidence: records.filter(
        (r) => r.url && (sites.get(domain(r.url))?.length || 0) > 1,
      ),
      base: records,
      method:
        "Share of records at domains appearing more than once. This does not prove brand loyalty.",
    },
  ].map((t) => ({
    ...t,
    score:
      t.base.length >= 5
        ? Math.round((t.evidence.length / t.base.length) * 100)
        : null,
  }));
  return {
    interests,
    sites: rankedSites,
    dated,
    shop,
    tendencies,
    excluded: records.filter((r) => sensitive.test(r.title + " " + r.url))
      .length,
  };
}
export function recommendations(
  products: Product[],
  a: ReturnType<typeof analyze>,
) {
  return products
    .map((p) => {
      const i = a.interests.find(
        (i) =>
          i.name.toLowerCase() === p.category.toLowerCase() &&
          i.feedback !== "inaccurate",
      );
      return {
        ...p,
        score: i ? i.score : 0,
        evidence: i?.evidence.length || 0,
      };
    })
    .filter((p) => p.evidence >= 3)
    .sort((a, b) => b.score - a.score);
}

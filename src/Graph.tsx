import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { RecordItem, Product } from "./engine";
import { graphModel } from "./graph-model";
const colors = [
  "#b7a0ff",
  "#66dfc0",
  "#f5bf75",
  "#76baff",
  "#ef99c7",
  "#e2df83",
  "#99c8b0",
  "#b8a9e9",
];
export default function Graph({
  records,
  query,
  onSelect,
  products,
  mode = "categories",
}: {
  records: RecordItem[];
  query: string;
  products?: Product[];
  mode?: string;
  onSelect: (name: string, e: RecordItem[]) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    const { nodes, links }: { nodes: any[]; links: any[] } = graphModel(
      records,
      products,
      mode,
    );
    const root = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (e) => root.attr("transform", e.transform)),
    );
    const line = root
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#9c91bd")
      .attr("stroke-opacity", 0.22)
      .attr("stroke-width", (d: any) => Math.min(5, 1 + Math.log(d.value)));
    const n = root
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d: any) => d.label)
      .style("cursor", "pointer")
      .attr("opacity", (d: any) =>
        !query || d.label.toLowerCase().includes(query.toLowerCase())
          ? 1
          : 0.12,
      )
      .on("click", (_, d) => onSelect(d.label, d.evidence))
      .on("keydown", (e, d) => {
        if (e.key === "Enter") onSelect(d.label, d.evidence);
      });
    n.append("circle")
      .attr("r", (d: any) => d.size + 6)
      .attr("fill", (d: any) => colors[d.group % 8])
      .attr("opacity", 0.06);
    n.append("circle")
      .attr("r", (d: any) => d.size)
      .attr("fill", (d: any) => colors[d.group % 8])
      .attr("fill-opacity", (d: any) => (d.type ? 0.5 : 0.75))
      .attr("stroke", (d: any) => colors[d.group % 8]);
    n.append("text")
      .text((d: any) => d.label)
      .attr("text-anchor", "middle")
      .attr("y", (d: any) => d.size + 19)
      .attr("fill", "var(--text)")
      .attr("font-size", 11);
    n.append("title").text(
      (d: any) =>
        `${d.label} · ${d.type}: ${d.evidence.length} supporting records`,
    );
    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(105),
      )
      .force("charge", d3.forceManyBody().strength(-130))
      .force("center", d3.forceCenter(450, 260))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => d.size + 25),
      )
      .on("tick", () => {
        line
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
        n.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    n.call(
      d3
        .drag<any, any>()
        .on("start", (e, d) => {
          if (!e.active) sim.alphaTarget(0.25).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (e, d) => {
          d.fx = e.x;
          d.fy = e.y;
        })
        .on("end", (e, d) => {
          if (!e.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );
    return () => {
      sim.stop();
    };
  }, [records, query, onSelect, products, mode]);
  return (
    <svg
      ref={ref}
      viewBox="0 0 900 520"
      className="network"
      aria-label="Interactive interest network"
    />
  );
}
